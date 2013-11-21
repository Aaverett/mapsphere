//Layer.js
//Aaron Averett
//This is the base class from which all of the layer classes are derived.

MapSphere.Layers.Layer = MapSphere.UIEventHost.extend({
    _geometry: null,

    _visibleExtent: null,

    _isVisible: true,

    _material: null,
    _ellipsoid: null,

    init: function (options)
    {
        if(MapSphere.notNullNotUndef(options.visible))
        {
            this._isVisible = options.visible;
        }

        if(MapSphere.notNullNotUndef(options.ellipsoid))
        {
            this._ellipsoid = options.ellipsoid;
        }
        else
        {
            this._ellipsoid = new MapSphere.Math.Ellipsoid();
        }
    },

    initMaterial: function()
    {
        //In this base implementation, we create a basic material that will at least show up as something visible in the scene.
        this._material = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    },

    //Return the geometry.
    getGeometry: function () {
    },

    setVisibleExtent: function (extent) {
        this._visibleExtent = extent;
    },

    refreshGeometry: function()
    {
        //The default implementation doesn't have any geometry, so we do nothing.
    },

    generateEllipseGeometryForVisibleExtent: function()
    {
        var parallels = 36;
        var meridians = 36;

        var triangleCount = (parallels * meridians * 2)

        var newGeometry = new THREE.BufferGeometry();
        
        newGeometry.attributes = {
            index: {
                itemSize: 1,
                array: new Uint16Array(triangleCount * 3)
            },

            position: {
                itemsize: 3,
                array: new Float32Array(triangles * 3 * 3)
            },

            normal: {
                itemsize: 3,
                array: new Float32Array(triangles * 3 * 3)
            },

            color: {
                itemsize: 3,
                array: new Float32Array(triangles * 3 * 3)
            }
        };

        //Initialize the index
        var chunksize = 21845;
        var indices = newGeometry.attributes.index.array;

        for(var i=0; i < indices.length; i++)
        {
            var val = i % (3 * chunksize);
            indices[i] = val;
        }

        var positions = this.geometry.attributes.position.array();
        var normals = this.geometry.attributes.normals.array();
        var colors = this.geometry.attributes.normals.array();

        var theta = 0;
        var rho = 0;
        var thetaIndex;

        //This is our initial theta...
        var theta0 = this._visibleExtent.ne.lng();
        var thetaPrime = this._visibleExtent.sw.lng();
        var rho0 = this._visibleExtent.ne.lat();
        var rhoPrime = this._visibleExtent.sw.lat();

        var thetaRange = thetaPrime - theta0;
        var rhoRange = rhoPrime - rho0;

        var thetaStep = thetaRange / meridians;
        var rhoStep = thetaRange / parallels;

        theta = theta0;
        while(theta < thetaPrime)
        {
            rho = rhoPrime;
            while(rho > rho0)
            {

            }
        }
    }

});