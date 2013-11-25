//Decoration.js
//Aaron Averett
//This is the base class for the decoration, a georeferenced texture placed a layer.

MapSphere.Decorations.Decoration = MapSphere.UIEventHost.extend({

    //The layer upon which this decoration is drawn.
    _layer: null,

    init: function (options)
    {

    },

    refreshContents: function()
    {
        //Nothing to do in the base implementation.
    }
});