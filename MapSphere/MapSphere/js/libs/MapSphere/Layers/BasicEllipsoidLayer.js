//BasicEllipsoidLayer.js
//Aaron Averett
//

MapSphere.Layers.BasicEllipsoidLayer = MapSphere.Layers.Layer.extend({

    _color1: null,
    _color2: null,

    init: function (options) {
        this._super(options);

        //Fetch the colors from the options, if applicable.
        if (MapSphere.notNullOrUndef(options.color1)) {
            if (options.color1 instanceof THREE.Color) {
                this._color1 = options.color1;
            }
            else {
                this._color1 = new THREE.Color(options.color1);
            }
        }

        if (MapSphere.notNullOrUndef(options.color2)) {
            if (options.color2 instanceof THREE.Color) {
                this._color2 = options.color1;
            }
            else {
                this._color2 = new THREE.Color(options.color2);
            }
        }

        this.initMaterial();
    },

    initMaterial: function () {
        //Creates a material for our geometry.
        var options = {
            color: this._color1,
            vertexColors: THREE.VertexColors
        };
        this._material = new THREE.MeshLambertMaterial(options);
    },

    setVisibleExtent: function(extent)
    {
        this._super(extent);

        this.refreshGeometry();
    },

    refreshGeometry: function()
    {
        //First, generate the geometry for the given extent.
        var geom = this.generateEllipsoidGeometryForVisibleExtent();
    }
});