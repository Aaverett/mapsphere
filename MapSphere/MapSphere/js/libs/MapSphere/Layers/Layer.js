//Layer.js
//Aaron Averett
//This is the base class from which all of the layer classes are derived.

MapSphere.Layers.Layer = MapSphere.UIEventHost.extend({
    _mapSphere: null,
    _geometry: null,

    _visibleExtent: null,

    _isVisible: true,

    _material: null,
    _ellipsoid: null,

    _triangleCount: 0,

    _vertexColors: new Array(),

    _decorations: new Array(),

    _texture: null,

    _mesh: null,
    _geometryRootNode: null,

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

            //Did the user provide any decorations?
            if(MapSphere.notNullNotUndef(options.decorations))
            {
                this._decorations = options.decorations;

                for(var i=0; i < this._decorations.length; i++)
                {
                    this._decorations[i].setLayer(this);
                }
            }
        }
    },

    initMaterial: function()
    {
        //In this base implementation, we create a basic material that will at least show up as something visible in the scene.
        //this._material = new THREE.MeshLambertMaterial({ map: this._texture });
        this._material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors, wireframe: true});
    },

    setMapSphere: function(mapSphere)
    {
        this._mapSphere = mapSphere;
    },

    getMapSphere: function(mapSphere)
    {
        return this._mapSphere;
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

    getVisibleExtent: function() {
        return this._visibleExtent;
    },

    refreshGeometry: function()
    {
        for(var i = 0; i < this._decorations.length; i++)
        {
            this._decorations[i].refreshContents();
        }
    },

    //This generates a buffer geometry object that matches the ellipsoid at the layer's current extent.  A texture, such as a map image from a map service, could be used
    //to add additional information.
    generateEllipseGeometryForVisibleExtent: function()
    {
        if (this._geometryRootNode == null)
        {
            //function(parent, minTheta, maxTheta, minRho, maxRho, ellipsoid, steps, altitude, material)

            var theta0Deg = this._visibleExtent.getSW().lng();
            var rho0Deg = this._visibleExtent.getNE().lat();
            var thetaPrimeDeg = this._visibleExtent.getNE().lng();
            var rhoPrimeDeg = this._visibleExtent.getSW().lat();

            var theta0 = MapSphere.degToRad(theta0Deg);
            var rho0 = MapSphere.degToRad(rho0Deg);
            var thetaPrime = MapSphere.degToRad(thetaPrimeDeg);
            var rhoPrime = MapSphere.degToRad(rhoPrimeDeg);

            this.geometryRootNode = new MapSphere.Math.DetailTreeNode(null, theta0, thetaPrime, rho0, rhoPrime, this._ellipsoid, 16, 0, this._material);
        }
        else
        {

        }

        return this.geometryRootNode.getMesh();

        var parallels = 72;
        var meridians = 72;

        var triangles = (parallels * meridians * 2) - (2 * meridians);

        this._geometry = new THREE.BufferGeometry();

        this._geometry.attributes = {
            index: {
                itemSize: 1,
                array: new Uint16Array(triangles * 3),
            },

            position: {
                itemSize: 3,
                array: new Float32Array(triangles * 3 * 3),
            },

            normal: {
                itemSize: 3,
                array: new Float32Array(triangles * 3 * 3),
            },

            color: {
                itemSize: 3,
                array: new Float32Array(triangles * 3 * 3),
            },

            uv: {
                itemSize: 2,
                array: new Float32Array(triangles * 3 * 2)
            }
        };


        // break geometry into
        // chunks of 21,845 triangles (3 unique vertices per triangle)
        // for indices to fit into 16 bit integer number
        // floor(2^16 / 3) = 21845

        var chunkSize = 21845;

        var indices = this._geometry.attributes.index.array;

        for (var i = 0; i < indices.length; i++) {
            var val = i % (3 * chunkSize);
            indices[i] = val;
        }

        var positions = this._geometry.attributes.position.array;
        var normals = this._geometry.attributes.normal.array;
        var colors = this._geometry.attributes.color.array;
        var uvs = this._geometry.attributes.uv.array;

        var theta = -1.0 * (Math.PI / 2);
        var rhoIndex = 0;
        var thetaIndex;

        var theta0Deg = this._visibleExtent.getSW().lng();
        var rho0Deg = this._visibleExtent.getNE().lat();
        var thetaPrimeDeg = this._visibleExtent.getNE().lng();
        var rhoPrimeDeg = this._visibleExtent.getSW().lat();

        var theta0 = MapSphere.degToRad(theta0Deg);
        var rho0 = MapSphere.degToRad(rho0Deg);
        var thetaPrime = MapSphere.degToRad(thetaPrimeDeg);
        var rhoPrime = MapSphere.degToRad(rhoPrimeDeg);

        var thetaRange = thetaPrime - theta0;
        var rhoRange = rho0 - rhoPrime;

        //This goes all the way around, so we use 2 pi.
        var thetaStep = thetaRange / meridians;
        //This is only half of the circle (north pole to south pole) so we use only 1 times pi.
        var rhoStep = rhoRange / parallels;
        var pointsIndex = 0;

        //We don't actually do the last rho step, as that's a single point at the bottom.
        while (rhoIndex < parallels) {

            thetaIndex = 0;

            var rho = rho0 - (rhoIndex * rhoStep);
            var rho1 = rho0 - ((rhoIndex + 1) * rhoStep);

            //The conical top and bottom portions have triangles instead of two-triangle trapezoids.
            if ((rhoIndex == 0 && rho0 == (Math.PI / 2)) || (rhoIndex + 1 == parallels && rhoPrime == (-1.0 * Math.PI / 2))) {
                
                var v0, v1, v2;

                var cb = new THREE.Vector3();
                var ab = new THREE.Vector3();

                //North pole
                if (rhoIndex == 0) {
                    //v0 = this.toCartesian(0, rho, 0, false);
                    v0 = this._ellipsoid.toCartesianWithLngLatElevValues(0, rho, 0, false);
                    this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2), rho, 0, rho0, theta0, rhoPrime, thetaPrime);
                }
                else {
                    //south pole
                    //v0 = this.toCartesian(0, rho1, 0, false);
                    v0 = this._ellipsoid.toCartesianWithLngLatElevValues(0, rho1, 0, false);
                    this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2), rho1, 0, rho0, theta0, rhoPrime, thetaPrime);
                }

                //Convert to cartesian coords.


                for (thetaIndex = 0; thetaIndex < meridians; thetaIndex++) {
                    theta = (thetaIndex * thetaStep) + theta0;
                    theta1 = (thetaIndex + 1) * thetaStep + theta0;

                    //If it's the first ring (north pole)
                    if (rhoIndex == 0) {
                        v2 = this._ellipsoid.toCartesianWithLngLatElevValues(theta, rho1, 0, false);
                        v1 = this._ellipsoid.toCartesianWithLngLatElevValues(theta1, rho1, 0, false);
                        this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2) + 0, rho, theta, rho0, theta0, rhoPrime, thetaPrime);
                        this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2) + 2, rho1, theta1, rho0, theta0, rhoPrime, thetaPrime);
                        //v2 = this.toCartesian(theta, rho1, 0, false);
                        //v1 = this.toCartesian(theta1, rho1, 0, false);
                    }
                    else {
                        //Otherwise, assume south pole
                        v2 = this._ellipsoid.toCartesianWithLngLatElevValues(theta1, rho, 0, false);
                        v1 = this._ellipsoid.toCartesianWithLngLatElevValues(theta, rho, 0, false);
                        this.addTextureCoordsForVertex(uvs, ((pointsIndex  / 3) * 2) + 0, rho, theta1, rho0, theta0, rhoPrime, thetaPrime);
                        this.addTextureCoordsForVertex(uvs, ((pointsIndex  / 3) * 2) + 2, rho, theta, rho0, theta0, rhoPrime, thetaPrime);
                        //v2 = this.toCartesian(theta1, rho, 0, false);
                        //1 = this.toCartesian(theta, rho, 0, false);
                    }

                    var r, g, b;
                    if ((rhoIndex + thetaIndex) % 2 == 1) {
                        r = 0.8;
                        g = 0.8;
                        b = 0.8;
                    }
                    else {
                        r = 0.6;
                        g = 0.6;
                        b = 0.6;
                    }

                    this.addTriangle(positions, normals, colors, v0, v2, v1, pointsIndex, r, g, b);
                    pointsIndex += 9;
                }
            }
            else {

                //THis is the normal case, where we'ere not doing a top or a bottom.  In thise case, we actually do two triangles for each step.

                var v0, v1, v2, v3;

                for (thetaIndex = 0; thetaIndex < meridians; thetaIndex++) {
                    theta = thetaIndex * thetaStep + theta0;
                    theta1 = (thetaIndex + 1) * thetaStep + theta0;

                    var r, g, b;
                    if ((rhoIndex + thetaIndex) % 2 == 1) {
                        r = 0.8;
                        g = 0.8;
                        b = 0.8;
                    }
                    else {
                        r = 0.6;
                        g = 0.6;
                        b = 0.6;
                    }

                    v0 = this._ellipsoid.toCartesianWithLngLatElevValues(theta, rho, 0, false);
                    v1 = this._ellipsoid.toCartesianWithLngLatElevValues(theta1, rho1, 0, false);
                    v2 = this._ellipsoid.toCartesianWithLngLatElevValues(theta, rho1, 0, false);
                    v3 = this._ellipsoid.toCartesianWithLngLatElevValues(theta1, rho, 0, false);

                    this.addTriangle(positions, normals, colors, v0, v2, v1, pointsIndex, r, g, b);
                    this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2) + 0, rho, theta, rho0, theta0, rhoPrime, thetaPrime);
                    this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2) + 2, rho1, theta, rho0, theta0, rhoPrime, thetaPrime);
                    this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2) + 4, rho1, theta1, rho0, theta0, rhoPrime, thetaPrime);

                    pointsIndex += 9;

                    this.addTriangle(positions, normals, colors, v0, v1, v3, pointsIndex, r, g, b);
                    this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2) + 0, rho, theta, rho0, theta0, rhoPrime, thetaPrime);
                    this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2) + 2, rho1, theta1, rho0, theta0, rhoPrime, thetaPrime);
                    this.addTextureCoordsForVertex(uvs, ((pointsIndex / 3) * 2) + 4, rho, theta1, rho0, theta0, rhoPrime, thetaPrime);
                    pointsIndex += 9;
                }
            }

            rhoIndex++;
        }

        this._geometry.offsets = [];

        var offsets = triangles / chunkSize;

        for (var i = 0; i < offsets; i++) {
            var offset = {
                start: i * chunkSize * 3,
                index: i * chunkSize * 3,
                count: Math.min(triangles - (i * chunkSize), chunkSize) * 3
            };

            this._geometry.offsets.push(offset);
        }

        this._geometry.computeBoundingSphere();

        var mesh = new THREE.Mesh(this._geometry, this._material);

        mesh.userData.loader = this;

        return mesh;

    },
    
    addTextureCoordsForVertex: function(uvs, arrayPosition, rho, theta, rho0, theta0, rhoPrime, thetaPrime)
    {
        var u, v;

        var totalRangeRho = Math.abs(rhoPrime - rho0);
        var totalRangeTheta = thetaPrime - theta0;

        u = Math.abs((theta - theta0) / totalRangeTheta);
        v = 1 - Math.abs((rho - rho0) / totalRangeRho);

        uvs[arrayPosition + 0] = u;
        uvs[arrayPosition + 1] = v;
    },

    //Adds a triangle to the buffer geometry at the given index.
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

        colors[pointsIndex] = r;
        colors[pointsIndex + 1] = g;
        colors[pointsIndex + 2] = b;

        colors[pointsIndex + 3] = r;
        colors[pointsIndex + 4] = g;
        colors[pointsIndex + 5] = b;

        colors[pointsIndex + 6] = r;
        colors[pointsIndex + 7] = g;
        colors[pointsIndex + 8] = b;
    },

    //Updates the material applied to our geometry with custom vertex and fragment shaders
    //This is done in order to support multiple textures.
    updateTextures: function()
    {
        var textures = new Array();

        //Compose an array of all the textures to be blended.
        for (var i = 0; i < this._decorations.length; i++)
        {
            var dec = this._decorations[i];

            var decTex = dec.getTextures();

            for(var j=0; j < decTex.length; j++)
            {
                textures.push(decTex[j]);
            }
        }

        //Now, we need to blend the images together.
        var blendedTexture = MapSphere.stackTextures(textures);

        this._texture = blendedTexture;

        this.initMaterial();

        this._mesh.material = this._material;

        return;

    }

});