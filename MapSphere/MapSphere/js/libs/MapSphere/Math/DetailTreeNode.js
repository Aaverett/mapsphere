MapSphere.Math.DetailTreeNode = MapSphere.UIEventHost.extend({
    //Local vars
    _parentNode: null,
    _childNodes: null,
    _geometry: null,
    _minTheta: null,
    _maxTheta: null,
    _minRho: null,
    _maxRho: null,
    _ellipsoid: null,
    _steps: null,
    _altitude: 0,
    _material: null,

    _mesh: null,

    _enhancedNodeCount: 0,

    init: function(parent, minTheta, maxTheta, minRho, maxRho, ellipsoid, steps, altitude, material)
    {
        this._altitude = altitude;
        //this._texInfo = texInfo;
        this._material = material;
        this._steps = steps;
        this._minTheta = minTheta;
        this._maxTheta = maxTheta;
        this._minRho = minRho;
        this._maxRho = maxRho;
        this._ellipsoid = ellipsoid;

        this._childNodes = new Array(steps);

        for (var i = 0; i < this._childNodes.length; i++)
        {
            this._childNodes[i] = new Array(steps);
        }

        //Create the mesh container that contains 
        this._mesh = new THREE.Object3D();

        //Build the geometry.
        this.refreshGeometry();
    },

    //Creates the geometry for this object.
    refreshGeometry: function()
    {
        var triangleCount = (this._steps * this._steps - this._enhancedNodeCount) * 2;
        var vertexCount = triangleCount * 3;

        this._geometry = new THREE.BufferGeometry();

        this._geometry.attributes = {
            index: {
                itemSize: 1,
                array: new Uint16Array(triangleCount * 3),
            },

            position: {
                itemSize: 3,
                array: new Float32Array(triangleCount * 3 * 3),
            },

            normal: {
                itemSize: 3,
                array: new Float32Array(triangleCount * 3 * 3),
            },

            color: {
                itemSize: 3,
                array: new Float32Array(triangleCount * 3 * 3),
            },

            uv: {
                itemSize: 2,
                array: new Float32Array(triangleCount * 3 * 2)
            }
        };

        var chunkSize = 21845;

        var indices = this._geometry.attributes.index.array;

        for (var i = 0; i < indices.length; i++) {
            var val = i % (3 * chunkSize);
            indices[i] = val;
        }

        var thetaStep = (this._maxTheta - this._minTheta) / this._steps;
        var rhoStep = (this._maxRho - this._minRho) / this._steps;
        var pointIndex = 0;
        var uvIndex = 0;

        var curTheta = this._minTheta;
        var curRho = this._minRho;

        for(var i=0; i < this._steps; i++)
        {
            var nextRho = curRho + rhoStep;
            for(var j=0; j < this._steps; j++)
            {
                var nextTheta = curTheta + thetaStep;
                

                var v0 = this._ellipsoid.toCartesianWithLngLatElevValues(curTheta, curRho, this._altitude, false);
                var v1 = this._ellipsoid.toCartesianWithLngLatElevValues(nextTheta, curRho, this._altitude, false);
                var v2 = this._ellipsoid.toCartesianWithLngLatElevValues(curTheta, nextRho, this._altitude, false);
                var v3 = this._ellipsoid.toCartesianWithLngLatElevValues(nextTheta, nextRho, this._altitude, false);

                var r, g, b;

                if (pointIndex % 2)
                {
                    r = g = b = 0.6;
                }
                else
                {
                    r = g = b = 0.8;
                }

                this._addTriangle(v2, v1, v0, pointIndex, r, g, b);
                pointIndex += 9;
                
                this._addTriangle(v2, v3, v1, pointIndex, r, g, b);
                pointIndex += 9;

                curTheta = nextTheta;
            }
            curRho = nextRho;
        }

        this._geometry.offsets = [];

        var offsets = triangleCount / chunkSize;

        for (var i = 0; i < offsets; i++) {
            var offset = {
                start: i * chunkSize * 3,
                index: i * chunkSize * 3,
                count: Math.min(triangleCount - (i * chunkSize), chunkSize) * 3
            };

            this._geometry.offsets.push(offset);
        }

        this._geometry.computeBoundingSphere();


        var mesh = new THREE.Mesh(this._geometry, this._material);

        this._mesh.add(mesh);
    },
    
    _addTriangle: function(v0, v1, v2, pointsIndex, r, g, b)
    {
        var positions = this._geometry.attributes.position.array;
        var normals = this._geometry.attributes.normal.array;
        var colors = this._geometry.attributes.color.array;

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

    enhanceExtent: function(extent)
    {

    },

    simplifyExtent: function(extent)
    {

    },

    getMesh: function()
    {
        return this._mesh;
    }
});