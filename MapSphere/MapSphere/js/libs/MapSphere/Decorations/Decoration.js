//Decoration.js
//Aaron Averett
//This is the base class for the decoration, a georeferenced texture placed a layer.

MapSphere.Decorations.Decoration = MapSphere.UIEventHost.extend({

    //The layer upon which this decoration is drawn.
    _layer: null,


    _textures: null,

    init: function (options)
    {
        this._textures = new Array();
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