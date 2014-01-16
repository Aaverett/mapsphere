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
    _tilesPerExtent: 4,
    init: function(options)
    {

    },

    getTileIndicesForCoords: function(coord, zoomLevel)
    {
        var xIndex, yIndex;

        //Reproject to webMercator.
        var x = MapSphere.degToRad(coord.lng());
        var y = MapSphere.asinh(Math.tan(MapSphere.degToRad(coord.lat())));

        x = (1 + (x / Math.PI)) / 2;
        y = (1 - (y / Math.PI)) / 2;

        var numTiles = Math.pow(2, zoomLevel);

        xIndex = Math.floor(x * numTiles);
        yIndex = Math.floor(y * numTiles);

        //Compose an object containing the tile indices, and return it.
        return { x: xIndex, y: yIndex, z: zoomLevel};
    },

    getTileURLForCoords: function(coord, zoomLevel)
    {
        var indices = this.getTileIndicesForCoords(coord, zoomLevel);
    },

    getBestZoomLevelForExtent: function(extent)
    {
        var ret = this._minZoomLevel;

        var ne = extent.getNE();
        var sw = extent.getSW();

        var latExtent = ne.lat() - sw.lat();
        var lonExtent = ne.lng() - sw.lng();
        
        //There's probably an easier way to do this that involves just computing the proper zoom level, but this should be OK for now.
        for (var i = this._minZoomLevel ; i < this._maxZoomLevel; i++)
        {
            var numTiles = Math.pow(2, i);

            var degPerTileX = (this._tileSetMaxLon - this._tileSetMinLon) / numTiles;
            var degPerTileY = (this._tileSetMaxLat - this._tileSetMinLat) / numTiles;

            if ((degPerTileX * this._tilesPerExtent) < lonExtent || (degPerTileY * this._tilesPerExtent) < latExtent)
            {
                ret = i;
                break;
            }
        }

        return ret;
    },

    getTileIndicesForExtent: function(extent, zoomLevel)
    {
        var indicesSW = this.getTileIndicesForCoords(extent.getSW(), zoomLevel);
        var indicesNE = this.getTileIndicesForCoords(extent.getNE(), zoomLevel);

        return {sw: indicesSW, ne: indicesNE};
    },

    getTileURLForIndices: function(z, y, x)
    {
        return this._baseURL + "/" + z + "/" + y + "/" + x;
    },

    requestTile: function(z, y, x)
    {           
        var url = this.getTileURLForIndices(z, y, x);
    },

    refreshContents: function()
    {
        var visibleExtent = this._layer.getVisibleExtent();

        var zoomLevel = this.getBestZoomLevelForExtent(visibleExtent);

        var indices = this.getTileIndicesForExtent(visibleExtent, zoomLevel);

        var count = 0;

        for(var i=indices.ne.y; i < indices.sw.y; i++) //The indices on the Y axis for the tiles are reversed, 
        {
            for(var j=indices.sw.x; j < indices.ne.x; j++)
            {
                //Request the tile from the service.
                //i = y index
                //j = x index
                this.requestTile(zoomLevel, i, j);

            }
        }

        

    }
});