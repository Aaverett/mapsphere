//StaticTextureDecoration.js
//This is a really basic decoration that drapes an image over the given layer's surface geometry.

MapSphere.Decorations.StaticTextureDecoration = MapSphere.Decorations.Decoration.extend({
    _texturePath: null,
    _texture: null, //This type of decoration only has one texture, so we just keep a handle on it.
    _tempImg: null,
    init: function (options)
    {
        //Do the base class initialization.
        this._super(options);


        if(MapSphere.notNullNotUndef(options.texturePath))
        {
            this.setImagePath(options.texturePath);
        }
    },

    setImagePath: function(imagePath)
    {
        this._texturePath = imagePath;

        this.loadTexture();
    },

    loadTexture: function()
    {
        if (this._texturePath != null)
        {
            var img = document.createElement("img");
            img.onload = this.loadTextureComplete.bind(this);
            img.src = this._texturePath;
            this._tempImg = img;
            
        }
    },

    loadTextureComplete: function()
    {
        if (this._tempImg != null)
        {
            this._textures.push(this._tempImg);
        }

        this._layer.updateTextures();
    }
});