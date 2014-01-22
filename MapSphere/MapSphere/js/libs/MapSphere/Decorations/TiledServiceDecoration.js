//This is the base ("abstract") class for the tiled service decoration.  Presumably, this would be used to provide textures to a surface.  It should be noted however, that it could just as easily be used to provide
//height information from a tiled DEM.  Thus, classes implementing this need to implement getProvidesTexture() themselves in order for it to function.

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
    _tileFilenameExtension: ".png",
    _tilesPerExtent: 4,

    _tileLoadQueue: null,
    init: function(options)
    {
        this._super(options);
        this._tileLoadQueue = new Array();
    },

    getTileIndicesForCoords: function(coord, zoomLevel)
    {
        //Thi
        function long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
        function lat2tile(lat, zoom) {
            return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
        }

        var xIndex = long2tile(coord.lng(), zoomLevel);
        var yIndex = lat2tile(coord.lat(), zoomLevel);

        //Sanity check on the Y index.
        if (yIndex < 0)
        {
            yIndex = 0;
        }
        else if (yIndex == Infinity)
        {
            yIndex = Math.pow(2, zoomLevel);
        }

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
        return this._baseURL + z + "/" + x + "/" + y + this._tileFilenameExtension;
    },

    requestTile: function(z, y, x, request)
    {           
        var url = this.getTileURLForIndices(z, y, x);

        var tile = {
            img: null,
            z: z,
            x: x,
            y: y,
            url: url,
            request: request
        };

        var img = document.createElement("img");
        img.crossOrigin = "anonymous";
        img.onload = this.loadTileComplete.bind(this);
        tile.img = img;
        img.src = url; //This will light off the loading process.
        
        this._tileLoadQueue.push(tile);
    },

    loadTileComplete: function(args)
    {
        //We need to add this tile to the texture for the given extent.
        //Find the tile in the tile load queue.

        var tile = null;
        
        for(var i=0; i < this._tileLoadQueue.length; i++)
        {
            if(this._tileLoadQueue[i].img == args.currentTarget)
            {
                //Ok, we found it.

                tile = this._tileLoadQueue[i];
                break;
            }
        }

        if(tile != null)
        {
            //Now, we composite this tile into the texture.
            this._addTileToCompositeTexture(tile);
        }

        tile.request.loadedTiles++;

        //If all of the tiles have been loaded...
        if(tile.request.loadedTiles == tile.request.totalTiles)
        {
            var callbackArgs =
            {
                sender: this,
                image: tile.request.canvas
            };

            tile.request.callback(callbackArgs);
        }
    },

    refreshContents: function()
    {
        var visibleExtent = this._layer.getVisibleExtent();
        //this.produceTextureForExtent(); Hold off on doing this for now - I'm not sure we need it.
    },

    produceTextureForRequest: function(request)
    {
        var zoomLevel = this.getBestZoomLevelForExtent(request.extent);

        var indices = this.getTileIndicesForExtent(request.extent, zoomLevel);

        request.zoomLevel = zoomLevel;
        request.indices = indices;
        request.canvas = null;
        request.totalTiles = Math.abs((indices.ne.x - indices.sw.x) * (indices .ne.y - indices.sw.y));
        request.loadedTiles = 0;
          
        var count = 0;

        for (var i = indices.ne.y; i < indices.sw.y; i++) //The indices on the Y axis for the tiles are reversed, 
        {
            for (var j = indices.sw.x; j < indices.ne.x;j++) {
                //Request the tile from the service.
                //i = y index
                //j = x index
                this.requestTile(zoomLevel, i, j, request);
            }
        }
    },

    _addTileToCompositeTexture: function(tile)
    {
        var img = tile.img;

        var canvas = tile.request.canvas;
        var ctx;
        //If no canvas exists, create it.
        if(canvas == null)
        {
            canvas = document.createElement("canvas");
            canvas.width = 2048;
            canvas.height = 2048;

            tile.request.canvas = canvas;
            ctx = canvas.getContext("2d");
            ctx.fillStyle = "rgba(0,0,0,0)";
            ctx.fillRect(0, 0, 2048, 2048);
        }
        else
        {
            ctx = canvas.getContext("2d");
        }

        var numTilesX = tile.request.indices.ne.x - tile.request.indices.sw.x;
        var numTilesY = tile.request.indices.sw.y - tile.request.indices.ne.y;

        //Fetch the (geographic) bounds of the requested set of tiles...
        var requestedExtentMaxX = tile.request.extent.getNE().lng();
        var requestedExtentMinX = tile.request.extent.getSW().lng();
        var requestedExtentMaxY = tile.request.extent.getNE().lat();
        var requestedExtentMinY = tile.request.extent.getSW().lat();
        var requestedExtentX = requestedExtentMaxX - requestedExtentMinX;
        var requestedExtentY = requestedExtentMaxY - requestedExtentMinY;

        var practicalMaxX = requestedExtentMaxX;
        var practicalMaxY = requestedExtentMaxY;
        var practicalMinX = requestedExtentMinX;
        var practicalMinY = requestedExtentMinY;

        if (practicalMaxX > this._tileSetMaxLon) practicalMaxX = this._tileSetMaxLon;
        if (practicalMinX < this._tileSetMinLon) practicalMinX = this._tileSetMinLon;
        if (practicalMaxY > this._tileSetMaxLat) practicalMaxY = this._tileSetMaxLat;
        if (practicalMinY < this._tileSetMinLat) practicalMinY = this._tileSetMinLat;

        var tileFractionalWidth = (practicalMaxX - practicalMinX)  / (numTilesX * 360);
        var tileFractionalHeight = (practicalMaxY - practicalMinY) / (numTilesY * 180);

        var fractionX0 = (practicalMinX - requestedExtentMinX) / requestedExtentX;
        var fractionY0 = (practicalMinY - requestedExtentMinY) / requestedExtentY;

        var fractionX = fractionX0 + (tile.x * tileFractionalWidth);
        var fractionY = fractionY0 + (tile.y * tileFractionalHeight);
        var fractionY1 = fractionY0 + ((tile.y + 1) * tileFractionalHeight);

        function y2lat(a) { return 180 / Math.PI * (2 * Math.atan(Math.exp(a * Math.PI / 180)) - Math.PI / 2); }

        //RIGHT HERE!!
        var y = ((1 - fractionY) - 0.5) * 2 * 90;
        var y1 = ((1 - fractionY1) - 0.5) * 2 * 90;

        var lat0 = y2lat(y);
        var lat1 = y2lat(y1);

        var newFractionY = 1 - (lat0 / 90);
        var newFractionY1 = 1 - (lat1 / 90);
        var newFracDiff = Math.abs(newFractionY - newFractionY1);
        var newHeight = newFracDiff * canvas.height;
        // /RIGHT HERE!!

        var posX = fractionX * canvas.width;
        var posY = newFractionY * canvas.height;
        var finalWidth = tileFractionalWidth * canvas.width;
        var finalHeight = tileFractionalHeight * canvas.height;

        if (tile.y == 0)
        {
            var q = 0;
        }

        ctx.drawImage(img, posX, posY, finalWidth, newHeight);
        ctx.rect(posX, posY, finalWidth, finalHeight);

        //tile.request.texture.needsUpdate = true;
        
    },

    handlePendingTextureRequests: function()
    {
        //Loop over the requests
        for (var i = 0; i < this._textureRequests.length; i++) {
            var req = this._textureRequests[i];

            if (!req.pending) {
                //Ok, it's not pending yet...  We need to process it.
                this.handleTextureRequest(req);
            }
        }
    },

    handleTextureRequest: function(req)
    {
        this.produceTextureForRequest(req);
    }
});