MapSphere.Decorations.TiledServiceDecoration = MapSphere.Decorations.Decoration.extend({
    _tileDimensionX: 256,
    _tileDimenionY: 256,
    _minZoomLevel: 0,
    _maxZoomLevel: 18,
    _tileSetMaxLat: 90,
    _tileSetMinLat: -90,
    _tileSetMaxLon: 180,
    _tileSetMinLon: -180,
    _baseURL: "",
    init: function(options)
    {

    },

    getTileIndicesForCoords: function(coord, zoomLevel)
    {
        var xIndex, yIndex;

        //Reproject to webMercator.
        var x = MapSphere.degToRad(coord.lng());
        var y = MapSphere.asinh(Math.tan(MapSphere.degToRad(coord.lat())));

        var x = (1 + (x / Math.PI)) / 2;
        var y = (1 - (y / Matph.PI)) / 2;

        var numTiles = Math.pow(2, zoomLevel);

        xIndex = Math.floor(x / numTiles);
        yIndex = Math.floor(y / numTiles);

        //Compose an object containing the tile indices, and return it.
        return { x: xIndex, y: yIndex, z: zoomLevel};
    },

    getTileURLForCoords: function(coord, zoomLevel)
    {
        var indices = this.getTileIndicesForCoords(coord, zoomLevel);
    },

    getLowestZoomLevelForExtent: function(extent)
    {

    },

    refreshContents: function()
    {
        var visibleExtent = this._layer.getVisibleExtent();

        var zoomLevel = this.getLowestZoomLevelForExtent(visibleExtent);




    }
});