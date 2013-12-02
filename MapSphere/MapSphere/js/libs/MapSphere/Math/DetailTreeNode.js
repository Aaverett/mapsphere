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
    _bMesh: null,

    _enhancedNodeCount: 0,
    _lodAggression: 2,

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

        //If a mesh already exists, remove it from the scene graph
        if (this._bMesh != null)
        {
            this._mesh.remove(this._bMesh);
        }

        //Create a new mesh...
        this._bMesh = new THREE.Mesh(this._geometry, this._material);

        //Add the new mesh to the scene graph
        this._mesh.add(this._bMesh);
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

    enhanceExtent: function(theta0, thetaPrime, rho0, rhoPrime)
    {
        var maxTheta, minTheta, maxRho, minRho;

        maxTheta = this._maxTheta;
        minTheta = this._minTheta;
        maxRho = this._maxRho;
        minRho = this._minRho;

        if (minTheta > maxTheta)
        {
            maxThetaewzaa
        }
         
        var newThetaSpan = thetaPrime - theta0;
        var newRhoSpan = rhoPrime - rho0;

        var thetaSpan = Math.abs(this._maxTheta - this._minTheta);
        var rhoSpan = Math.abs(this._maxRho - this._minRho);

        //First, we need to figure out which polys we're actually replacing.
        var thetaStep = thetaSpan / this._steps;
        var rhoStep = rhoSpan / this._steps;

        var thetaIndex0 = Math.abs(Math.floor((this._minTheta - theta0) / thetaStep));
        var thetaIndex1 = Math.abs(Math.ceil((this._minTheta - thetaPrime) / thetaStep));

        var rhoIndex0 = Math.abs(Math.floor(rho0 / rhoStep));
        var rhoIndex1 = Math.abs(Math.ceil(rhoPrime / rhoStep));
            
        var phantomThetaIndex1 = thetaIndex1;
        var thetaIndexSpan;
        var rhoIndexSpan = rhoIndex1 - rhoIndex0;
        if (phantomThetaIndex1 < thetaIndex0)
        {
            phantomThetaIndex1 += this._steps;
        }

        thetaIndexSpan = phantomThetaIndex1 - thetaIndex0;

        //Now, we check to see if our extent has changed sufficiently to be enhanced at our set state of aggression.
        if (rhoIndexSpan <= this._lodAggression && thetaIndexSpan <= this._lodAggression) {

 

            //The rho indices don't wrap around, so we just reverse them if 
            if (rhoIndex0 > rhoIndex1) {
                var tempRI = rhoIndex0;
                rhoIndex0 = rhoIndex1;
                rhoIndex1 = tempRI;
            }

            //Now, create a new node in the child index in question.
            for (var i = rhoIndex0; i <= rhoIndex1; i++) {
                var tileMinRho = i * rhoStep;
                var tileMaxRho = (i + 1) * rhoStep;

                for (var j = 0; j <= thetaIndexSpan; j++) {

                    var curThetaIdx = thetaIndex0 + j;

                    //wrap the current index back around to zero if it crosses the prime meridian.
                    if (curThetaIdx >= this._steps)
                    {
                        curThetaIdx -= this._steps;
                    }

                    //init: function(parent, minTheta, maxTheta, minRho, maxRho, ellipsoid, steps, altitude, material)
                    var tileMinTheta = curThetaIdx * thetaStep;
                    var tileMaxTheta = (curThetaIdx + 1) * thetaStep;

                    this._childNodes[i][curThetaIdx] = new MapSphere.Math.DetailTreeNode(this, tileMinTheta, tileMaxTheta, tileMinRho, tileMaxRho, this._ellipsoid, this._steps, this._material);

                    this._mesh.add(this._childNodes[i][curThetaIdx].getMesh());
                }
            }

            this.refreshGeometry();
        }
        
    },

  

    simplifyExtent: function(extent)
    {

    },

    getMesh: function()
    {
        return this._mesh;
    }
});