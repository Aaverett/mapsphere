//StaticTextureDecoration.js
//This is a really basic decoration that drapes an image over the given layer's surface geometry.

MapSphere.Decorations.StaticTextureDecoration = MapSphere.Decorations.Decoration.extend({
    _texturePath: null,
    _texture: null,

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
            this._texture = THREE.ImageUtils.loadTexture(this._text);
        }
    }
});