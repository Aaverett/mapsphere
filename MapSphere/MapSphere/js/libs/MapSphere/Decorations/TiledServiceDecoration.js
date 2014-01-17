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
        return this._baseURL + z + "/" + y + "/" + x + this._tileFilenameExtension;
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
    },

    refreshContents: function()
    {
        var visibleExtent = this._layer.getVisibleExtent();
        //this.produceTextureForExtent(); Hold off on doing this for now - I'm not sure we need it.
    },

    produceTextureForExtent: function(extent)
    {
        var zoomLevel = this.getBestZoomLevelForExtent(extent);

        var indices = this.getTileIndicesForExtent(visibleExtent, zoomLevel);

        var request = {
            extent: visibleExtent,
            zoomLevel: zoomLevel,
            indices: indices,
            canvas: null,
            texture: null
        };

        var count = 0;

        for (var i = indices.ne.y; i < indices.sw.y; i++) //The indices on the Y axis for the tiles are reversed, 
        {
            for (var j = indices.sw.x; j < indices.ne.x; j++) {
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

        //If no canvas exists, create it.
        if(canvas == null)
        {
            canvas = document.createElement("canvas");
            canvas.width = 2048;
            canvas.height = 2048;

            tile.request.canvas = canvas;
        }

        var totalExtentX = this._tileSetMaxLon - this._tileSetMinLon;

        var totalExtentY = this._tileSetMaxLat - this._tileSetMinLat;

        var numtiles = Math.pow(2, tile.z);

        var tileExtentX = totalExtentX / numtiles;
        var tileExtentY = totalExtentY / numtiles;

        var fullTextureExtent = tile.request.extent;

        var textureMinLon = fullTextureExtent.getSW().lng();
        var textureMaxLon = fullTextureExtent.getNE().lng();
        var textureMinLat = fullTextureExtent.getSW().lat();
        var textureMaxLat = fullTextureExtent.getNE().lat();

        var fullTextureExtentX = textureMaxLon - textureMinLon;
        var fullTextureExtentY = textureMaxLat - textureMinLat;

        var tileLeftLongitude = this._tileSetMinLon + (tile.x) * tileExtentX;
        var tileTopLatitude = this._tileSetMaxLat - ((tile.y) * tileExtentY);

        var fractionX = (tileLeftLongitude - this._tileSetMinLon) / fullTextureExtentX;
        var fractionY = (this._tileSetMaxLat - tileTopLatitude) / fullTextureExtentY;

        var ctx = canvas.getContext("2d");

        var posX = fractionX * canvas.width;
        var posY = fractionY * canvas.height;

        ctx.drawImage(img, posX, posY, img.width, img.height);

        if(tile.request.texture == null)
        {
            tile.request.texture = new THREE.Texture(canvas);
        }

        tile.request.texture.needsUpdate = true;
        
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

    }
});