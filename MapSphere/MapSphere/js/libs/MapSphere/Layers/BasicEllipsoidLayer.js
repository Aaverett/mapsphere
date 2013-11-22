//BasicEllipsoidLayer.js
//Aaron Averett
//

MapSphere.Layers.BasicEllipsoidLayer = MapSphere.Layers.Layer.extend({

    init: function (options) {
        this._super(options);

        //Make sure we actually had options passed in.
        if (MapSphere.notNullNotUndef(options)) {
            //Fetch the colors from the options, if applicable.
            if (MapSphere.notNullNotUndef(options.color1)) {
                if (options.color1 instanceof THREE.Color) {
                    var color = options.color1;
                    this._vertexColors.push(color);
                }
                else {
                    var color = new THREE.Color(options.color1);
                    this._vertexColors.push(color);
                }
            }

            if (MapSphere.notNullNotUndef(options.color2)) {
                var color;
                if (options.color2 instanceof THREE.Color) {
                    var color = options.color2;
                    this._vertexColors.push(color);
                }
                else {
                    color = new THREE.Color(options.color2);
                    this._vertexColors.push(color);
                }
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
        var geom = this.generateEllipseGeometryForVisibleExtent();
    }
});