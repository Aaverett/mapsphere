//StaticTextureDecoration.js
//This is a really basic decoration that drapes an image over the given layer's surface geometry.

MapSphere.Decorations.StaticTextureDecoration = MapSphere.Decorations.Decoration.extend({
    _texturePath: null,
    _texture: null, //This type of decoration only has one texture, so we just keep a handle on it.
    
    init: function (options)
    {
        //Do the base class initialization.
        this._super();


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
            var tex = THREE.ImageUtils.loadTexture(this._texturePath);

            var ind = $.inArray(this._texture, this._textures);

            if(ind > -1)
            {
                this._textures.splice(ind, 1);
            }

            this._textures.push(tex);
        }
    }
});