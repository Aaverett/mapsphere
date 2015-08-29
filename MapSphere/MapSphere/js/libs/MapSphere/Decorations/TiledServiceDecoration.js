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
    _tilesPerExtent: 2,

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
            canvas.width = 1024;
            canvas.height = 1024;

            tile.request.canvas = canvas;
            ctx = canvas.getContext("2d");
            ctx.fillStyle = "rgba(0,0,0,0)";
            ctx.fillRect(0, 0, 1024, 1024);
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

        //Now we have to figure out the Y.
        function webMercToLat(y, zoom)
        {
            var webMercMaxLat = 85.05113;
            var webMercMinLat = -85.05113;

            var pow = 1.0 * (y / ((128 / Math.PI) * Math.pow(2, zoom))) - Math.PI;

            var angle = Math.pow(Math.E, pow);
            var lat = -1 * (2 * Math.atan(angle) - (Math.PI/2)) * (180 / Math.PI);

            return lat;
        }

        function webMercToLon(x, zoom)
        {
            var lon = (Math.PI / (128 * Math.pow(2, zoom)) * x - Math.PI) * (180 / Math.PI);

            return lon ;
        }

        //Compute the left and right edges of our tile within our texture.
        var globalXFrac = tile.x * img.width - 0.5;
        var globalXFrac1 = (tile.x + 1) * img.width - 0.5;
        var lon = webMercToLon(globalXFrac, tile.z);
        var lon1 = webMercToLon(globalXFrac1, tile.z);

        var diffX = lon - requestedExtentMinX;
        var diffX1 = lon1 - requestedExtentMinX;

        var fractionX = diffX / requestedExtentX;
        var fractionX1 = diffX1 / requestedExtentX;
        var posX = fractionX * canvas.width;
        var posX1 = fractionX1 * canvas.width;
        var finalWidth = posX1 - posX;

        
        //Compute the Y coordinates of the top and bottom edges of the tile within our texture.
        var globalYFrac = tile.y * img.height - 0.5;
        var globalYFrac1 = (tile.y + 1) * img.height + 0.5;

        var lat = webMercToLat(globalYFrac, tile.z);
        var lat1 = webMercToLat(globalYFrac1, tile.z);

        var diffY = requestedExtentMaxY - lat;
        var diffY1 = requestedExtentMaxY - lat1;

        var fractionY = diffY / requestedExtentY;
        var fractionY1 = diffY1 / requestedExtentY;

        var posY = fractionY * canvas.height;
        var posY1 = fractionY1 * canvas.height;

        var finalHeight = (posY1 - posY);
              
        ctx.drawImage(img, posX, posY, finalWidth, finalHeight);
        ctx.rect(posX, posY, finalWidth, finalHeight);
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