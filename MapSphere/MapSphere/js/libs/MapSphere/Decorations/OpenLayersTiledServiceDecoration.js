MapSphere.Decorations.OpenLayersTiledServiceDecoration = MapSphere.Decorations.TiledServiceDecoration.extend({
    
    init: function(options)
    {
        this._super(options);


        var letter = "a";

        this._baseURL = "http://" + letter + ".tile.openstreetmap.org/";
    },

    getProvidesTexture: function()
    {
        return true;
    }
});