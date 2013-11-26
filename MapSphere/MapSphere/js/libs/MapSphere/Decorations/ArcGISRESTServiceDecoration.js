MapSphere.Decorations.ArcGISRESTServiceDecoration = MapSphere.Decorations.Decoration.extend({

    //This is the URL for the map service on the server.
    _mapServiceURL: null,
    _mapServiceMetadata: null,
    _currentMapImageUrl: null,

    _tempImg: null,

    init: function (options)
    {
        this._super(options);

        if(MapSphere.notNullNotUndef(options.mapServiceURL))
        {
            this.setMapServiceURL(options.mapServiceURL);
        }
    },

    setMapServiceURL: function(mapServiceURL)
    {
        this._mapServiceURL = mapServiceURL;
        this.refreshMapServiceMetadata();
    },

    refreshMapServiceMetadata: function()
    {
        var data = {
            f: "json"
        };

        var opts = {
            complete: this.handleRefreshMapServiceMetadataResponse.bind(this),
            data: data
        };

        $.ajax(this._mapServiceURL, opts);
    },

    handleRefreshMapServiceMetadataResponse: function(args)
    {
        //Save the response data as our new metadata
        var resposneData = JSON.parse(args.responseText);
        this._mapServiceMetadata = resposneData;
        
        //Call the initialization complete business.
        this.initComplete();

        if (this._visible)
        {
            this.refreshMap();
        }
    },

    refreshContents: function()
    {
        this.refreshMap();
    },

    setLayer: function(layer)
    {
        this._super(layer);

        //If we're visible, refresh the map.
        if (this._visible)
        {
            this.refreshMap();
        }
    },

    //The process for checking whether we're really able to query the map is complex enough that it 
    //deserves its own function.
    checkCanRequestMap: function()
    {
        var ret = true;

        if (this._mapServiceURL == null) ret = false;

        if (this._mapServiceMetadata == null) ret = false;
        else
        {
            if (this._mapServiceMetadata.capabilities.indexOf("Map") == -1) ret = false;
        }

        if (this._layer == null) ret = false;

        return ret;
    },

    refreshMap: function()
    {
        if(this.checkCanRequestMap())
        {
            var visibleExtent = this._layer.getVisibleExtent();
            var bbox = visibleExtent.getSW().lng() + "," + visibleExtent.getSW().lat() + "," + visibleExtent.getNE().lng() + "," + visibleExtent.getNE().lat();
            var extentWidth = visibleExtent.getNE().lng() - visibleExtent.getSW().lng();
            var extentHeight = visibleExtent.getNE().lat() - visibleExtent.getSW().lat();
            var extentAR = extentWidth / extentHeight;
            var imgWidth, imgHeight;

            if (extentAR >= 1) {
                imgWidth = 2048;
                imgHeight = imgWidth / extentAR;
            }
            else {
                imgHeight = 2048
                imgWidth = imgHeight / extentAR;
            }

            var imgDimensions = imgWidth + "," + imgHeight;

            //Compose a request for a map of the visible area.
            var fullUrl = this._mapServiceURL + "/export";

            var data = {
                f: "json",
                bbox: bbox,
                size: imgDimensions,
                imageSR: "4326",
                format: "png"
            };

            var ajaxOpts = {
                data: data,
                complete: this.handleRefreshMapResponse.bind(this)
            };

            $.ajax(fullUrl, ajaxOpts);
        }
    },

    handleRefreshMapResponse: function(args) {
        var responseData = JSON.parse(args.responseText);

        var imageUrl = responseData.href;

        this.setCurrentMapImageUrl(imageUrl);
    },

    setCurrentMapImageUrl: function(url)
    {
        this._currentMapImageUrl = url;

        this.loadTexture();
    },

    loadTexture: function()
    {
        if (this._currentMapImageUrl != null) {
            var img = document.createElement("img");
            img.crossOrigin = "anonymous";
            img.onload = this.loadTextureComplete.bind(this);
            img.src = this._currentMapImageUrl;
            this._tempImg = img;

        }
    },

    loadTextureComplete: function()
    {
        if (this._tempImg != null) {
            this._textures.push(this._tempImg);
        }

        this._layer.updateTextures();
    }
});