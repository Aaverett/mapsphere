//Layer.js
//Aaron Averett
//This is the base class from which all of the layer classes are derived.

MapSphere.Layers.Layer = MapSphere.UIEventHost.extend({
    _geometry: null,

    _visibleExtent: null,

    _isVisible: true,

    _material: null,
    _ellipsoid: null,

    _triangleCount: 0,

    _vertexColors: null,

    init: function (options)
    {
        if (MapSphere.notNullNotUndef(options)) {
            if (MapSphere.notNullNotUndef(options.visible)) {
                this._isVisible = options.visible;
            }

            if (MapSphere.notNullNotUndef(options.ellipsoid)) {
                this._ellipsoid = options.ellipsoid;
            }
            else {
                this._ellipsoid = new MapSphere.Math.Ellipsoid();
            }
        }
    },

    initMaterial: function()
    {
        //In this base implementation, we create a basic material that will at least show up as something visible in the scene.
        this._material = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    },

    //Return the geometry.
    getGeometry: function () {
        return this._geometry; 
    },

    getMesh: function() {
        return this._mesh;
    },

    setVisibleExtent: function (extent) {
        this._visibleExtent = extent;
    },

    refreshGeometry: function()
    {
        //The default implementation doesn't have any geometry, so we do nothing.
    },

    //This generates a buffer geometry object that matches the ellipsoid at the layer's current extent.  A texture, such as a map image from a map service, could be used
    //to add additional information.
    generateEllipseGeometryForVisibleExtent: function()
    {
        var parallels = 36;
        var meridians = 36;

        //The class triangle count keeps track of how many triangles the layer's geometry has.
        this._triangleCount = 0;

        //This is the number of triangles we're theoretically going to have.
        var triangleCount = (parallels * meridians * 2)

        var newGeometry = new THREE.BufferGeometry();
        
        newGeometry.attributes = {
            index: {
                itemSize: 1,
                array: new Uint16Array(triangleCount * 3)
            },

            position: {
                itemsize: 3,
                array: new Float32Array(triangleCount * 3 * 3)
            },

            normal: {
                itemsize: 3,
                array: new Float32Array(triangleCount * 3 * 3)
            },

            color: {
                itemsize: 3,
                array: new Float32Array(triangleCount * 3 * 3)
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

        var positions = newGeometry.attributes.position.array;
        var normals = newGeometry.attributes.normal.array;
        var colors = newGeometry.attributes.color.array;

        var theta = 0;
        var rho = 0;
        var thetaIndex;

        //This is our initial theta...
        var theta0 = this._visibleExtent.getNE().lng();
        var thetaPrime = this._visibleExtent.getSW().lng();
        var rho0 = this._visibleExtent.getNE().lat();
        var rhoPrime = this._visibleExtent.getSW().lat();

        var thetaRange = thetaPrime - theta0;
        var rhoRange = rhoPrime - rho0;

        var thetaStep = thetaRange / meridians;
        var rhoStep = thetaRange / parallels;
        var pointsIndex = 0;

        var defaultColor = new THREE.Color(0xaaaaaa);

        theta = theta0;
        while (rho > rho0)
        {
            rho = rhoPrime;
            while(theta < thetaPrime)
            {
                var theta1 = theta + thetaStep;
                var rho1 = rho + rhoStep;

                var v0, v1, v2, v3;

                v0 = this._ellipsoid.toCartesianWithLngLatElev(rho, theta, 0);
                v1 = this._ellipsoid.toCartesianWithLngLatElev(rho, theta1, 0);
                v2 = this._ellipsoid.toCartesianWithLngLatElev(rho1, theta, 0);
                v3 = this._ellipsoid.toCartesianWithLngLatElev(rho1, theta1, 0);

                var color = null;
                if (this._vertexColors == null)
                {
                    color = defaultColor;                    
                }
                else
                {
                    color = this._vertexColors[(pointsIndex / 18) % this._vertexColors.length]
                }

                this.addTriangle(positions, normals, colors, v0, v1, v2, pointsIndex, color.r, color.g, color.b);
                pointsIndex += 9;
                this.addTriangle(positions, normals, colors, v1, v3, v2, pointsIndex, color.r, color.g, color.b);
                pointsIndex += 9;
            }
        }

        var offsets = triangleCount / chunksize;

        for (var i = 0; i < offsets; i++) {
            var offset = {
                start: i * chunksize * 3,
                index: i * chunksize * 3,
                count: Math.min(triangleCount - (i * chunksize), chunksize) * 3
            };

            newGeometry.offsets.push(offset);
        }

        newGeometry.computeBoundingSphere();

        this._geometry = newGeometry;

        var mesh = new THREE.Mesh(this._geometry, this._material);

        mesh.userData.layer = this;

        this._mesh = mesh;

    },

    addTriangle: function (positions, normals, colors, v0, v1, v2, pointsIndex, r, g, b) {
        var ab = new THREE.Vector3();
        var cb = new THREE.Vector3();

        positions[pointsIndex] = v0.x;
        positions[pointsIndex + 1] = v0.y;
        positions[pointsIndex + 2] = v0.z;
        positions[pointsIndex + 3] = v1.x;
        positions[pointsIndex + 4] = v1.y;
        positions[pointsIndex + 5] = v1.z;
        positions[pointsIndex + 6] = v2.x;
        positions[pointsIndex + 7] = v2.y;
        positions[pointsIndex + 8] = v2.z;

        //Now, compute the normals.
        cb.subVectors(v2, v1);
        ab.subVectors(v0, v1);
        cb.cross(ab);

        cb.normalize();

        normals[pointsIndex] = cb.x;
        normals[pointsIndex + 1] = cb.y;
        normals[pointsIndex + 2] = cb.z;
        normals[pointsIndex + 3] = cb.x;
        normals[pointsIndex + 4] = cb.y;
        normals[pointsIndex + 5] = cb.z;
        normals[pointsIndex + 6] = cb.x;
        normals[pointsIndex + 7] = cb.y;
        normals[pointsIndex + 8] = cb.z;

        var color = new THREE.Color();

        //color.setRGB(255, 255, 255);
        /*var r = Math.random();
        var g = Math.random();
        var b = Math.random();*/

        colors[pointsIndex] = r;
        colors[pointsIndex + 1] = g;
        colors[pointsIndex + 2] = b;

        colors[pointsIndex + 3] = r;
        colors[pointsIndex + 4] = g;
        colors[pointsIndex + 5] = b;

        colors[pointsIndex + 6] = r;
        colors[pointsIndex + 7] = g;
        colors[pointsIndex + 8] = b;

        //Increment the triangle count
        this._triangleCount++;
    },

});