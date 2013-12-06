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
    _usingParentMaterial: true,
    _texture: null,
    _textures: null,
    _active: true,
    _maxDepth: 6,

    _mesh: null,
    _bMesh: null,

    _enhancedNodeCount: 0,
    _lodAggression: 4,
    _decorations: null,

    init: function(parent, minTheta, maxTheta, minRho, maxRho, ellipsoid, steps, altitude, decorations)
    {
        this._parentNode = parent;
        this._altitude = altitude;
        this._steps = steps;
        this._minTheta = minTheta;
        this._maxTheta = maxTheta;
        this._minRho = minRho;
        this._maxRho = maxRho;
        this._ellipsoid = ellipsoid;
        this._decorations = decorations;

        //We're going to want to have a texture for each decoration.
        this._textures = new Array(this._decorations.length);

        this._childNodes = new Array(steps);

        for (var i = 0; i < this._childNodes.length; i++)
        {
            this._childNodes[i] = new Array(steps);
        }

        //Create the mesh container that contains 
        this._mesh = new THREE.Object3D();

        //Inherit or create the material...
        if (this._parentNode != null)
        {
            this._material = this._parentNode.getMaterial();
            this._usingParentMaterial = true;
        }
        else
        {
            this._material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors});
            this._usingParentMaterial = false;
        }

        //Build the geometry.
        this.refreshGeometry();

        //Load the texture(s)
        this.updateTextures();
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

        
        var curRho = this._minRho;

        var alternateColorCounter = 0;

        for(var i=0; i < this._steps; i++)
        {
            var curTheta = this._minTheta;
            var nextRho = curRho + rhoStep;

            for(var j=0; j < this._steps; j++)
            {
                var nextTheta = curTheta + thetaStep;
                
                //Each quadrangle can be enhanced with a child node.  If it is enhanced, we don't display it here, as that would interpenetrate
                if (this._childNodes[i][j] == undefined || this._childNodes[i][j] == null) {

                    var v0 = this._ellipsoid.toCartesianWithLngLatElevValues(curTheta, curRho, this._altitude, false);
                    var v1 = this._ellipsoid.toCartesianWithLngLatElevValues(nextTheta, curRho, this._altitude, false);
                    var v2 = this._ellipsoid.toCartesianWithLngLatElevValues(curTheta, nextRho, this._altitude, false);
                    var v3 = this._ellipsoid.toCartesianWithLngLatElevValues(nextTheta, nextRho, this._altitude, false);

                    var r, g, b;

                    if (alternateColorCounter % 2) {
                        r = g = b = 0.6;
                    }
                    else {
                        r = g = b = 0.8;
                    }

                    this._addTriangle(v2, v0, v1, pointIndex, r, g, b);
                    pointIndex += 9;
                    
                    this._addTriangle(v2, v1, v3, pointIndex, r, g, b);
                    pointIndex += 9;

                    this._setUVsForFace(uvIndex, curTheta, nextTheta, curRho, nextRho);
                    uvIndex += 12;
                }

                curTheta = nextTheta;
                alternateColorCounter++;
            }
            curRho = nextRho;

            alternateColorCounter++;
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

    _setUVsForFace: function(uvIndex, curTheta, nextTheta, curRho, nextRho)
    {
        var thetaSpan = this._maxTheta - this._minTheta;
        var rhoSpan = this._maxRho - this._minRho;

        var v0u, v0v, v1u, v1v, v2u, v2v, v3u, v3v;
        v0u = (curTheta - this._minTheta) / thetaSpan;
        v0v = (curRho - this._minRho) / rhoSpan;
        v1u = (nextTheta - this._minTheta) / thetaSpan;
        v1v = (curRho - this._minRho) / rhoSpan;
        v2u = (curTheta - this._minTheta) / thetaSpan;
        v2v = (nextRho - this._minRho) / rhoSpan;
        v3u = (nextTheta - this._minTheta) / thetaSpan;
        v3v = (nextRho - this._minRho) / rhoSpan;

        var uvs = this._geometry.attributes.uv.array;
        uvs[uvIndex + 0] = v2u;
        uvs[uvIndex + 1] = v2v;
        uvs[uvIndex + 2] = v0u;
        uvs[uvIndex + 3] = v0v;
        uvs[uvIndex + 4] = v1u;
        uvs[uvIndex + 5] = v1v;

        uvs[uvIndex + 6] = v2u;
        uvs[uvIndex + 7] = v2v;
        uvs[uvIndex + 8] = v1u;
        uvs[uvIndex + 9] = v1v;
        uvs[uvIndex + 10] = v3u;
        uvs[uvIndex + 11] = v3v;
    },

    enhanceExtent: function(theta0, thetaPrime, rho0, rhoPrime)
    {
        //Make copies of the extent values...
        var workingTheta0, workingThetaPrime, workingRho0, workingRhoPrime;
        workingTheta0 = theta0;
        workingThetaPrime = thetaPrime;
        workingRho0 = rho0;
        workingRhoPrime = rhoPrime;
        
        if (theta0 < this._minTheta)
        {
            workingTheta0 = this._minTheta;
        }

        if (thetaPrime > this._maxTheta)
        {
            workingThetaPrime = this._maxTheta;
        }

        if (rho0 < this._minRho)
        {
            workingRho0 = this._minRho;
        }

        if (rhoPrime > this._maxRho)
        {
            workingRhoPrime = this._maxRho;
        }


        var thetaStep = (this._maxTheta - this._minTheta) / this._steps;
        var rhoStep = (this._maxRho - this._minRho) / this._steps;

        var startIndexTheta = Math.floor((workingTheta0 - this._minTheta) / thetaStep);
        var stopIndexTheta = Math.floor((workingThetaPrime - this._minTheta) / thetaStep);

        var startIndexRho = Math.floor((workingRho0 - this._minRho) / rhoStep);
        var stopIndexRho = Math.floor((workingRhoPrime - this._minRho) / rhoStep);

        //Constrain the indices to the bounds of our child arrays.
        if (startIndexRho < 0) startIndexRho = 0;
        if (stopIndexRho >= this._steps) stopIndexRho = this._steps - 1;

        if (startIndexTheta < 0) startIndexTheta = 0;
        if (stopIndexTheta >= this._steps) stopIndexTheta = this._steps - 1;

        var rhoIndexSpan = stopIndexRho - startIndexRho;
        var thetaIndexSpan = stopIndexTheta - startIndexTheta;
        
        var needUpdate = false;

        //is the visible area smaller than the aggression value?
        if(this.getCurrentDepth() < this._maxDepth && ( rhoIndexSpan <= this._lodAggression || thetaIndexSpan <= this._lodAggression))
        {
            for (var i = startIndexRho; i <= stopIndexRho; i++)
            {
                for (var j = startIndexTheta; j <= stopIndexTheta; j++)
                {
                    //If the child node doesn't exist at this index, create it.
                    if (!MapSphere.notNullNotUndef(this._childNodes[i][j]))
                    {
                        this._addChildNode(j, i);

                        //Add child node is deterministic, so we know for sure that a node will get added.  We therefore need to update our local geometry.
                        needUpdate = true;
                    }

                    //Tell the child node to enhance itself.
                    this._childNodes[i][j].enhanceExtent(theta0, thetaPrime, rho0, rhoPrime);
                    
                }
            }

            
        }
        else
        {
            for(var i = startIndexRho; i <= stopIndexRho; i++)
            {
                for(var j = startIndexTheta; j <= stopIndexTheta; j++)
                {
                    //Attempt to kill the child node.  This will return true if a node is actually removed.
                    if(this._killChildNode(j, i))
                    {
                        needUpdate = true;
                    }                   
                }
            }
        }

        //If any nodes were added or removed, we need to update.
        if (needUpdate) {
            this.refreshGeometry();
        }
    },

    _addChildNode: function(thetaIndex, rhoIndex)
    {
        var minTheta, maxTheta, minRho, maxRho;

        var thetaStep = (this._maxTheta - this._minTheta) / this._steps;
        var rhoStep = (this._maxRho - this._minRho) / this._steps;

        minTheta = this._minTheta + (thetaIndex * thetaStep);
        maxTheta = this._minTheta + (thetaIndex + 1) * thetaStep;
        minRho = this._minRho + (rhoIndex * rhoStep);
        maxRho = this._minRho + ((rhoIndex + 1) * rhoStep);

        var childNode = new MapSphere.Math.DetailTreeNode(this, minTheta, maxTheta, minRho, maxRho, this._ellipsoid, this._steps, this._altitude, this._decorations);

        this._childNodes[rhoIndex][thetaIndex] = childNode;

        this._mesh.add(childNode.getMesh());

        this._enhancedNodeCount++;
    },

    _killChildNode: function(thetaIndex, rhoIndex)
    {
        var needUpdate = false;

        if(MapSphere.notNullNotUndef(this._childNodes[rhoIndex]) && MapSphere.notNullNotUndef(this._childNodes[rhoIndex][thetaIndex]))
        {
            var childNode = this._childNodes[rhoIndex][thetaIndex];

            this._mesh.remove(childNode.getMesh());
            this._enhancedNodeCount--;

            this._childNodes[rhoIndex][thetaIndex] = null;

            needUpdate = true;
        }

        return needUpdate;
    },

    simplifyExtent: function(extent)
    {

    },

    getMesh: function()
    {
        return this._mesh;
    },

    getCurrentDepth: function()
    {
        var ret = 0;

        if(this._parentNode != null)
        {
            ret = this._parentNode.getCurrentDepth();
            ret += 1;
        }

        return ret;
    },

    getMaterial: function()
    {
        return this._material;
    },

    getGeographicExtent: function () {

        var sw = new MapSphere.Geography.LngLat(MapSphere.radToDeg(this._minTheta), MapSphere.radToDeg(this._minRho));
        var ne = new MapSphere.Geography.LngLat(MapSphere.radToDeg(this._maxTheta), MapSphere.radToDeg(this._maxRho));

        var extent = new MapSphere.Geography.Envelope(sw, ne);

        return extent;
    },

    updateTextures: function()
    {
        var extent = this.getGeographicExtent();

        for (var i = 0; i < this._decorations.length; i++) {

            this._decorations[i].getTexturesForExtent(extent, this.handleDecorationGetExtentComplete.bind(this));
        }
    },

    handleDecorationGetExtentComplete: function(args)
    {
        alert("handling");
    }
});