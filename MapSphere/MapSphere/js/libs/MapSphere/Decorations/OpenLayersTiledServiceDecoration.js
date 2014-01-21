MapSphere.Decorations.OpenLayersTiledServiceDecoration = MapSphere.Decorations.TiledServiceDecoration.extend({
    
    init: function(options)
    {
        this._super(options);

        this._tileSetMaxLat = 85.05113;
        this._tileSetMinLat = -85.05113;


        var letter = "a";

        this._baseURL = "http://" + letter + ".tile.openstreetmap.org/";
    },

    getProvidesTexture: function()
    {
        return true;
    }
});