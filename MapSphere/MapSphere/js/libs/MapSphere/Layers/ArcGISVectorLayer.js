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
            if (this._geometryType == MapSphere.Constants.GeometryType_Point)
            {
                this._pointGeometryMaterials = new Array();
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

    handleRefreshDataFromMapServiceResponse: function(args)
    {
        //The response should have come back as JSON, so we'll try parsing it.
        var data = JSON.parse(args.responseText);

        if(MapSphere.notNullNotUndef(data.features))
        {
            //Great, we've got features.

            for(var i=0; i < data.features.length; i++)
            {
                var feature = data.features[i];

                this.addFeature(feature);
            }
        }
        else
        {
            //Uh oh.  For some reason, we didn't have features come back from the map service.
        }
    },

    populateFeatureWrapper: function(wrapper)
    {
        switch(this._geometryType)
        {
            case MapSphere.Constants.GeometryType_Point: this.populateFeatureWrapperPoint(wrapper);
                break;

            case MapSphere.Constants.GeometryType_Polyline:
                break;

            case MapSphere.Constants.GeometryType_Polygon:
                break;
        }
    },

    getFeatureLegendClassIndex: function(feature)
    {
        
        var ret = -1;
        var defaultIndex = 0;


        //Get a handle on the relevant bit of the legend metadata.
        var relevantLegendData = this._mapLegendMetadata.layers[this.layerIndex];
        var relevantLayerData = this._mapLayerMetadata;

        switch(relevantLayerData.drawingInfo.renderer.type)
        {
            case "uniqueValue": ret = this.getFeatureLegendClassIndexUniqueValues(feature);
                break;
        }

        if (ret == -1)
        {
            ret = defaultIndex;
        }

        return ret;
    },

    getFeatureLegendClassIndexUniqueValues: function(feature)
    {
        var ret = 0;
        var defaultDelta = 1; //

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

    populateFeatureWrapperPoint: function(wrapper)
    {
        //Compose a feature.
        var aGeom = wrapper.getFeature().geometry;

        var position = this._ellipsoid.toCartesianWithLngLatElevValues(aGeom.x, aGeom.y, 90000, true);

        var classIndex = this.getFeatureLegendClassIndex(wrapper.getFeature());

        if (this._pointGeometryMaterials[classIndex] == null) {
            /*var vshader = MapSphere.Assets["ArcGISPointFeatureVertexShader"];
            var fshader = MapSphere.Assets["ArcGISPointFeatureFragmentShader"];

            //The stock sprite shader isn't very flexible, so we'll replace it with this custom one.
            var s = new THREE.ShaderMaterial({
                vertexShader: vshader,
                fragmentShader: fshader
            });

            //For some reason, these don't get set, and then make THREE unhappy when this is rendered on a sprite.
            s.uvScale = new THREE.Vector2(100000.0, 100000.0);
            s.uvOffset = new THREE.Vector2(0.0, 0.0);
            s.color = new THREE.Color(0xffffff);*/

            s = new THREE.SpriteMaterial({map: this._legendSwatches[classIndex]});

            this._pointGeometryMaterials[classIndex] = s;
        }

        
        var mat = this._pointGeometryMaterials[classIndex];

        //var g = new THREE.SphereGeometry(100000, 4, 4);
        //var m = new THREE.Mesh(g, mat);

        var m = new THREE.Sprite(mat);
        m.position = position;
        m.scale = new THREE.Vector3(100000, 100000, 100000);
        wrapper.setGeometry(m);
        wrapper.setMaterial(mat);
        wrapper.setMesh(m);
    }
});
