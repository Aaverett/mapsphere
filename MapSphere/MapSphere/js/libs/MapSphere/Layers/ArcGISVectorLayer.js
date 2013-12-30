//
MapSphere.Layers.ArcGISVectorLayer = MapSphere.Layers.VectorGeometryLayer.extend({
    _mapServiceURL: null,
    layerIndex: null,
    _mapServiceMetadata: null,
    _mapLayerMetadata: null,
    _dataRefreshRequested: false,

    init: function (options)
    {
        //Do the base initialization.
        this._super(options);

        //Now, retrieve our
        if(MapSphere.notNullNotUndef(options.mapServiceURL))
        {
            this._mapServiceURL = options.mapServiceURL;
        }

        if(MapSphere.notNullNotUndef(options.layerIndex))
        {
            this.layerIndex = options.layerIndex;
        }

        this.refreshMapServiceMetadata()


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

    populateFeatureWrapperPoint: function(wrapper)
    {
        //Compose a feature.
        var aGeom = wrapper.getFeature().geometry;

        var position = this._ellipsoid.toCartesianWithLngLatElevValues(aGeom.x, aGeom.y, 50000, true);

        var sphere = new THREE.SphereGeometry(100000, 4, 4);

        wrapper.setGeometry(sphere);

        var mat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });

        wrapper.setMaterial(mat);

        wrapper.createDefaultMesh();

        wrapper.getMesh().position = position;
    }
});