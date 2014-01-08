//

//Load some assets we'll need later.
MapSphere.loadTextAsset("shaders/ArcGISPointFeatureVertexShader.glsl", "ArcGISPointFeatureVertexShader");
MapSphere.loadTextAsset("shaders/ArcGISPointFeatureFragmentShader.glsl", "ArcGISPointFeatureFragmentShader");

MapSphere.Layers.ArcGISVectorLayer = MapSphere.Layers.VectorGeometryLayer.extend({
    _mapServiceURL: null,
    layerIndex: null,
    _mapServiceMetadata: null,
    _mapLayerMetadata: null,
    _mapLegendMetadata: null,
    _dataRefreshRequested: false,
    _legendSwatches: null,
    _pointGeometryMaterials: null,
    _userPopulateGeometryFunction: null, //Function that is used in place the default geometry generation method.  Use this to override the standard method of geometry.
    _zFunction: null,               //Function that should be used to compute a z value.  Not used if this is null, obviously.
    _zField: null,                  //Attribute field that should be used for the Z value
    _verticalExaggeration: 1.0,     //Vertical exaggeration applied to Z values
    _useGeometryZ: true,
    _particleSystems: null,
    _particleGeometries: null,
    _tiles: 16,

    init: function (options)
    {
        //Do the base initialization.
        this._super(options);

        //Initialize this as an array.
        this._legendSwatches = new Array();

        //Now, retrieve our
        if(MapSphere.notNullNotUndef(options.mapServiceURL))
        {
            this._mapServiceURL = options.mapServiceURL;
        }

        if(MapSphere.notNullNotUndef(options.layerIndex))
        {
            this.layerIndex = options.layerIndex;
        }

        //Function that replaces the standard geometry generation function.
        if (MapSphere.notNullNotUndef(options.userPopulateGeometryFunction)) {
            this._userPopulateGeometryFunction = options.userPopulateGeometryFunction;
        }

        //Function that calculates the z value for the feature as a whole.
        if (MapSphere.notNullNotUndef(options.zFunction))
        {
            this._zFunction = options.zFunction;
        }

        //The name of a field in the feature to be interrogated for the z value applied to the feature in the scene.
        if (MapSphere.notNullNotUndef(options.zField))
        {
            this._zField = options.zField;
        }

        //Vertical exaggeration to be applied to the feature.
        if (MapSphere.notNullNotUndef(options.verticalExaggeration))
        {
            //Sanity check - make sure it's actually a number.
            if (MapSphere.isNumber(options.verticalExaggeration))
            {
                this._verticalExaggeration = options.verticalExaggeration;
            }
        }

        //A boolean value telling us whether we should use Z values on the native geometry, if present.  To use this, everything else (zField, zFunction should be set to null)
        if (MapSphere.notNullNotUndef(options.useGeometryZ))
        {
            //Default being true, we only modify this if we have an explicit false here.
            if(options.useGeometryZ === false)
            {
                this._verticalExaggeration = false;
            }
        }

        this.refreshMapServiceMetadata();
    },

    getFeaturePK: function(feature)
    {
        var ret = feature;

        if (this._pkField != null)
        {
            ret = feature.attributes[this._pkField];
        }

        return ret;
    },

    isInitialized: function()
    {
        var ret = true;

        if(this._mapServiceMetadata == null)
        {
            ret = false;
        }

        if(this._mapLayerMetadata == null)
        {
            ret = false;
        }

        return ret;
    },

    refreshMapServiceMetadata: function () {
        var data = {
            f: "json"
        };

        var opts = {
            complete: this.handleRefreshMapServiceMetadataResponse.bind(this),
            data: data
        };

        $.ajax(this._mapServiceURL, opts);
    },

    handleRefreshMapServiceMetadataResponse: function (args) {
        //Save the response data as our new metadata
        var resposneData = JSON.parse(args.responseText);
        this._mapServiceMetadata = resposneData;

        //Now that we have the service's metadata, we can request the layer's.
        this.requestLayerMetadataFromMapService();
        //Also, request the metadata for the legend from the map service.
        this.requestLegendMetadataFromMapService();
    },

    requestLayerMetadataFromMapService: function()
    {
        var data = {
            f: "json"
        };

        var opts = {
            complete: this.handleLayerMetadataFromMapServiceResponse.bind(this),
            data: data
        };

        $.ajax(this._mapServiceURL + "/" + this.layerIndex, opts);
    },

    handleLayerMetadataFromMapServiceResponse: function(args)
    {
        var responseData = JSON.parse(args.responseText);
        this._mapLayerMetadata = responseData;

        //Ok, we should have all of our data now.  Let's set up our local vars the way the base class wants them.
        for (var i = 0; i < this._mapLayerMetadata.fields.length; i++)
        {
            if(this._mapLayerMetadata.fields[i].type == "esriFieldTypeOID")
            {
                this._pkField = this._mapLayerMetadata.fields[i].name;
            }
        }

        //Get the geometry type.
        switch(this._mapLayerMetadata.geometryType)
        {
            case "esriGeometryPoint": this._geometryType = MapSphere.Constants.GeometryType_Point;
                break;
            case "esriGeometryPolyline": this._geometryType = MapSphere.Constants.GeometryType_Polyline;
                break;
            case "esriGeometryPolygon": this._geometryType = MapSphere.Constants.GeometryType_Polygon;
                break;
        }

        if(this.isInitialized() && this._dataRefreshRequested)
        {
            this.refreshGeometry();
        }
    },

    requestLegendMetadataFromMapService: function()
    {
        var url = this._mapServiceURL + "/legend?f=json";

        var opts = {
            complete: this.handleRequestLegendMetadataFromMapServiceResponse.bind(this)
        };

        $.ajax(url, opts);
    },

    handleRequestLegendMetadataFromMapServiceResponse: function(args)
    {
        var responseData = JSON.parse(args.responseText);

        this._mapLegendMetadata = responseData;

        //Now that we have the legend metadata, fetch the legend swatches for this item.
        this.refreshLegendSwatches();
    },

    refreshLegendSwatches: function()
    {
        if(this._mapLegendMetadata != null)
        {
            this._legendSwatches = new Array();

            //If we know our data is of the point geometry type...
            if (this._geometryType == MapSphere.Constants.GeometryType_Point)
            {
                this._pointGeometryMaterials = new Array();
                this._particleSystems = new Array();
                this._particleGeometries = new Array();
            }

            for(var i = 0; i < this._mapLegendMetadata.layers[this.layerIndex].legend.length; i++)
            {
                var ldata = this._mapLegendMetadata.layers[this.layerIndex].legend[i];
    
                var url = this._mapServiceURL + "/" + this.layerIndex + "/images/" + ldata.url;

                var t = THREE.ImageUtils.loadTexture(url);

                this._legendSwatches.push(t);

                //If this is a point layer, push a null onto the materials array for each class in the legend.
                if (this._geometryType == MapSphere.Constants.GeometryType_Point) {
                    this._pointGeometryMaterials.push(null);
                    this._particleSystems[i] = new Array();
                    this._particleGeometries[i] = new Array();

                    for(var j =0; j < this._tiles; j++)
                    {
                        this._particleSystems[i][j] = new Array();
                        this._particleGeometries[i][j] = new Array();

                        for(var k=0; k < this._tiles; k++)
                        {
                            this._particleSystems[i][j][k] = null;
                            this._particleGeometries[i][j][k] = null;
                        }
                    }

                    //Given that we're refreshing the legend swatches, at some point we should 
                }
            }
        }

        
    },

    refreshGeometry: function()
    {
        this._super();

        this.requestFeatureDataFromMapService();
    },

    requestFeatureDataFromMapService: function()
    {
        if(this.isInitialized())
        {
            var visibleExtent = this.getVisibleExtent();

            var data = {
                f: "json",
                geometryType: "esriGeometryEnvelope",
                geometry: visibleExtent.getSW().lng() + "," + visibleExtent.getSW().lat() + "," + visibleExtent.getNE().lng() + "," + visibleExtent.getNE().lat(),
                outFields: "*"
            };

            var opts = {
                data: data,
                complete: this.handleRefreshDataFromMapServiceResponse.bind(this)
            };

            var url = this._mapServiceURL + "/" + this.layerIndex + "/query";


            $.ajax(url, opts);

        }
        else
        {
            //set the flag
            this._dataRefreshRequested = true;
        }
    },

    //This handles the response from the map service when requesting actual feature data
    handleRefreshDataFromMapServiceResponse: function(args)
    {
        //The response should have come back as JSON, so we'll try parsing it.
        var data = JSON.parse(args.responseText);

        if(MapSphere.notNullNotUndef(data.features))
        {
            //Great, we've got features.
            var pendingFeatures = new Array();

            for(var i=0; i < data.features.length; i++)
            {
                var feature = data.features[i];

                pendingFeatures.push(feature);
            }

            this.addFeatures(pendingFeatures);
        }
        else
        {
            //Uh oh.  For some reason, we didn't have features come back from the map service.
        }
    },

    //Here, we've been asked to generate the 
    populateFeatureWrapper: function(wrapper)
    {
        //If the user provided a populate function
        if (this._userPopulateGeometryFunction != null) {
            var f = this._userPopulateGeometryFunction;

            var m = f(this, wrapper.getFeature());

            wrapper.setMesh(m);
        }
        else {
            switch (this._geometryType) {
                case MapSphere.Constants.GeometryType_Point: this.populateFeatureWrapperPoint(wrapper);
                    break;

                case MapSphere.Constants.GeometryType_Polyline: this.populateFeatureWrapperPolyline(wrapper);
                    break;

                case MapSphere.Constants.GeometryType_Polygon: this.populateFeatureWrapperPolygon();
                    break;
            }
        }
    },

    populateFeatureWrappers: function(wrappers)
    {
        if(this._userPopulateGeometryFunction != null)
        {

        }
        else {
            switch(this._geometryType)
            {
                case MapSphere.Constants.GeometryType_Point: this.populateFeatureWrappersPoint(wrappers);
                    break;
                case MapSphere.Constants.GeometryType_Polyline:
                    break;
                case MapSphere.Constants.GeometryType_Polygon:
                    break;
            }
        }
    },

    //This is an entry point for the fairly complex set of logic that determines which class in the legend our feature belongs to.  The map service doesn't tell us this, but we can use the
    //metadata to figure it out.  Because there are so many different ways that the data can be symbolized, all we do here is figure out what type we need, and pass control off the appropriate
    //method.
    getFeatureLegendClassIndex: function(feature)
    {
        var ret = -1;
        var defaultIndex = 0;

        //Get a handle on the relevant bit of the legend metadata.
        var relevantLegendData = this._mapLegendMetadata.layers[this.layerIndex];
        var relevantLayerData = this._mapLayerMetadata;

        switch(relevantLayerData.drawingInfo.renderer.type)
        {
            //The unique values type
            case "uniqueValue": ret = this.getFeatureLegendClassIndexUniqueValues(feature);
                break;
             
            //The "simple" type.  (This is the default when you drag a feature class into ArcMap)
            case "simple":
            default: ret = defaultIndex; //If we didn't figure out a type specifically, use this default, which should, at least theoretically, always work.
                break;
        }

        if (ret == -1)
        {
            ret = defaultIndex;
        }

        return ret;
    },

    //Figure out which symbol class a feature belongs to in a unique values scheme.
    getFeatureLegendClassIndexUniqueValues: function(feature)
    {
        var ret = 0;
        var defaultDelta = 0; //I forget why I added this, but it needs to be 1 sometimes.

        var values = this._mapLayerMetadata.drawingInfo.renderer.uniqueValueInfos;

        var fieldName = this._mapLayerMetadata.drawingInfo.renderer.field1;

        for(var i=0; i < values.length; i++)
        {
            var fval = feature.attributes[fieldName];

            if (fval == values[i].value)
            {
                //Ok, we found the class.
                ret = i + defaultDelta;
                break;
            }
        }

        return ret;
    },

    populateFeatureWrappersPoint: function(wrappers)
    {
        for(var i = 0; i < wrappers.length; i++)
        {
            var wrapper = wrappers[i];

            //Compose a vertex at that position.
            var aGeom = wrapper.getFeature().geometry;

            var zVal = this.getZVal(wrapper.getFeature());

            var position = this._ellipsoid.toCartesianWithLngLatElevValues(aGeom.x, aGeom.y, zVal, true);

            wrapper.setGeometry(position);
        }
    },

    //Populates a feature wrapper with geometry for a point feature.
    populateFeatureWrapperPoint: function(wrapper)
    {
        //Compose a feature.
        var aGeom = wrapper.getFeature().geometry;

        var zVal = this.getZVal(wrapper.getFeature());        
     
        var position = this._ellipsoid.toCartesianWithLngLatElevValues(aGeom.x, aGeom.y, zVal, true);

        var classIndex = this.getFeatureLegendClassIndex(wrapper.getFeature());

        //If the material for this particle doesn't exist yet...
        if (this._pointGeometryMaterials[classIndex] == null) {
            //Create it.
            var s = new THREE.ParticleBasicMaterial({
                map: this._legendSwatches[classIndex],
                size: 500000

                //color: 0xffffff
            });

            this._pointGeometryMaterials[classIndex] = s;
        }

        var LOD = this.getCurrentLod();
        
        var mat = this._pointGeometryMaterials[classIndex];

        //If the particle system for this class doesn't exist yet...
        if (this._particleSystems[classIndex] == null)
        {
            this._particleSystems[classIndex] = new Array();
        }

        //Which tile in that LOD are we looking at?

        this._particleGeometries[classIndex].vertices.push(position);
        
        wrapper.setGeometry(null);
        wrapper.setMaterial(mat);
        wrapper.setMesh(this._particleSystems[classIndex]);
    },

    getZVal: function(feature)
    {
        //Figure out the Z value.
        var zVal = 0;

        //If we have a user-defined z function, we go ahead and use it to determine this feature's z value.
        if (this._zFunction != null) {
            zVal = this._zFunction(feature);
        }
        else //Ok, use the default z value logic.
        {
            if (this._zField != null) //If we have a z field specified try to use that.
            {
                if (MapSphere.isNumber(feature.attributes[this._zField])) {
                    zVal = MapSphere.isNumber(feature.attributes[this._zField]);
                }
            }
            else if (MapSphere.notNullNotUndef(feature.geometry.z)) {
                zVal = feature.geometry.z;
            }
        }

        zVal = zVal * this._verticalExaggeration;

        return zVal;
    },

    populateFeatureWrapperPolyline: function(wrapper)
    {
        //TODO: Implement handling of polylines
    },

    populateFeatureWrapperPolygon: function(wrapper)
    {
        //TODO: Implement handling of polygons.
    },

    pickWithRayCaster: function(wrapper)
    {

    },

    //Override the base feature wrappers changed method
    featureWrappersChanged: function (changed) {
        switch (this._geometryType) {
            case MapSphere.Constants.GeometryType_Point: this.featureWrappersChangedPoints(changed);
                break;
            case MapSphere.Constants.GeometryType_Polyline: this._super();
                break;
            case MapSphere.Constants.GeometryType_Polygon: this._super();
                break;
        }
    },

    featureWrappersChangedPoints: function(changed)
    {
        //Compose an array to hold our geometry objects.
        var geometries = new Array();
        var particleSystems = new Array();

        //Ok, this is kind of ugly.  This will be a three-deep for loop because this is a three layer array.
        //First level is the legend classes.
        //Second level is the Y index.
        //Third level is the X index.
        for (var i = 0; i < this._legendSwatches.length; i++) {
            geometries[i] = new Array();
            particleSystems[i] = new Array();

            for(var j = 0; j < this._tiles; j++)
            {
                geometries[i][j] = new Array();
                particleSystems[i][j] = new Array();

                for(var k = 0; k < this._tiles; k++)
                {
                    geometries[i][j][k] = null;
                    particleSystems[i][j][k] = null;
                }
            }
        }
        
        //for each wrapper in our collection of wrappers...
        for(var i=0; i < this._featureWrappers.length; i++)
        {
            var wrapper = this._featureWrappers[i];

            var classIndex = this.getFeatureLegendClassIndex(wrapper.getFeature());
            var locIndices = this.getFeatureLocIndices(wrapper.getFeature());
            
            //Create the material, if needed.
            if (this._pointGeometryMaterials[classIndex] == null) {
                //Create it.
                var s = new THREE.ParticleBasicMaterial({
                    map: this._legendSwatches[classIndex],
                    size: 20,
                    sizeAttenuation: false,
                    transparency: true,
                    alphaTest: 0.5

                    //color: 0xffffff
                });

                this._pointGeometryMaterials[classIndex] = s;
            }

            //Create the geometry object, if it doesn't exist yet.
            if (geometries[classIndex][locIndices.y][locIndices.x] == null)
            {
                geometries[classIndex][locIndices.y][locIndices.x] = new THREE.Geometry();
                particleSystems[classIndex][locIndices.y][locIndices.x] = new THREE.ParticleSystem(geometries[classIndex][locIndices.y][locIndices.x], this._pointGeometryMaterials[classIndex]);
            }

            geometries[classIndex][locIndices.y][locIndices.x].vertices.push(wrapper.getGeometry());
            wrapper.setMesh(particleSystems[classIndex][locIndices.y][locIndices.x]);
        }

        //finally, remove and replace the existing particle systems.
        for(var i=0; i < this._particleSystems.length; i++)
        {
            for (var j = 0; j < particleSystems[i].length; j++)
            {
                for(var k=0; k < particleSystems[i][j].length; k++)
                {
                    if (particleSystems[i][j][k] != null)
                    {
                        this._mesh.remove(this._particleSystems[i][j][k]);
                        this._particleSystems[i][j][k] = particleSystems[i][j][k];
                        this._mesh.add(this._particleSystems[i][j][k]);
                    }
                }
            }
        }

        var q = 0;
    },

    getFeatureLocIndices: function(feature)
    {
        var xpos, ypos;
        var ret = { x: 0, y: 0};

        switch(this._geometryType)
        {
            
            case MapSphere.Constants.GeometryType_Point:
                xpos = feature.geometry.x;
                ypos = feature.geometry.y;
                break;
            case MapSphere.Constants.GeometryType_Polyline: this._super();
                break;
            case MapSphere.Constants.GeometryType_Polygon: this._super();
                break;
        }

        ret.x = Math.floor((180.0 + xpos) / this._tiles);
        ret.y = Math.floor((90.0 + ypos) / this._tiles)

        return ret;
    },
});
