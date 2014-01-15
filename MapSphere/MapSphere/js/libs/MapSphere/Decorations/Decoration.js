//Decoration.js
//Aaron Averett
//This is the base class for the decoration, a georeferenced texture placed a layer.

MapSphere.Decorations.Decoration = MapSphere.UIEventHost.extend({

    //The layer upon which this decoration is drawn.
    _layer: null,

    //This is an array of images that are later composited and used as a texture.
    _textures: null,

    //This is the geographic extent of the layer.
    _extent: null,

    _visible: true,

    _textureRequests: null,
    _providesElevation: false,
    _providesTexture: false,

    init: function (options)
    {
        this._textureRequests = new Array();
        this._elevationRequests = new Array();

        if (MapSphere.notNullNotUndef(options.visible))
        {
            this._visible = options.visible;
        }

        this._textures = new Array();

        this._extent = new MapSphere.Geography.Envelope(new MapSphere.Geography.LngLat(-180, -90), new MapSphere.Geography.LngLat(180, 90));
    },

    initComplete: function()
    {
        this.raiseEvent("initComplete", this);
    },

    refreshContents: function()
    {
        //Nothing to do in the base implementation.
    },

    getTextures: function()
    {
        return this._textures;
    },

    getTexturesForExtent: function(extent, callback)
    {
        var req = {
            extent: extent,
            callback: callback,
            data: null,
            texture: null,
            pending: false
        };

        this._textureRequests.push(req);

        this.handlePendingTextureRequests();
    },

    handlePendingTextureRequests: function()
    {
        //In the base implementation, we just finish all the pending requests.  Simple as that.
        for (var i = 0; i < this._textureRequests.length; i++)
        {
            var req = this._textureRequests[i];

            if (!req.pending) this.finishGetTextureForExtentRequest(req);
        }
    },

    finishGetTextureForExtentRequest: function(req)
    {
        var index = this._textureRequests.indexOf(req);

        if (index != -1)
        {
            this._textureRequests.splice(index, 1);
        }

        var args = {
            texture: req.texture,
            extent: req.extent,
            sender: this
        };

        req.callback(args);
    },

    setLayer: function(layer)
    {
        this._layer = layer;
    },

    getProvidesElevation: function()
    {
        return this._providesElevation;
    },

    getProvidesTexture: function()
    {
        return this._providesTexture;
    },

    getElevationForExtent: function(extent, stepsX, stepsY, callback)
    {
        var req = {
            extent: extent,
            callback: callback,
            data: null,
            elevData: null,
            pending: false,
            stepsX: stepsX,
            stepsY: stepsY
        };

        this._elevationRequests.push(req);

        this.handlePendingElevationRequests();
    },

    handlePendingElevationRequests: function () {

        //Note:  This is the base implementation, which doesn't have any business logic.  In a real
        //implementation that actually does something, this process is more involved.
        for (var i = 0; i < this._elevationRequests.length; i++) {
            var req = this._elevationRequests[i];

            if (!req.pending) this.finishGetElevationForExtentRequest(req);
        }
    },

    finishGetElevationForExtentRequest: function(req) {
        var index = this._elevationRequests.indexOf(req);

        if (index != -1) {
            this._elevationRequests.splice(index, 1);
        }

        var args = {
            elevData: req.elevData,
            extent: req.extent,
            sender: this
        };

        req.callback(args);
    },

    //Feature layers have an array of feature "wrappers" that contain a handle to both the raw feature data, and the relevant geometry
    //for that feature.
    getFeatureWrappers: function()
    {
        if(MapSphere.notNullNotUndef(this._featureWrappers))
        {
            return this._featureWrappers;
        }
    }
});