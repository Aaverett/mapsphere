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

    init: function (options)
    {
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

    setLayer: function(layer)
    {
        this._layer = layer;
    }
});