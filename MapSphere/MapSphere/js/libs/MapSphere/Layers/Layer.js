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
            //If the root geometry node hasn't been updated, 
            var theta0 = MapSphere.degToRad(-180);
            var rho0 = MapSphere.degToRad(-90);
            var thetaPrime = MapSphere.degToRad(180);
            var rhoPrime = MapSphere.degToRad(90);

            this._geometryRootNode = new MapSphere.Math.DetailTreeNode(null, theta0, thetaPrime, rho0, rhoPrime, this._ellipsoid, 32, 0, this._decorations);
        }
        else
        {
            var theta0Deg = this._visibleExtent.getSW().lng();
            var thetaPrimeDeg = this._visibleExtent.getNE().lng();
            var rho0Deg = this._visibleExtent.getSW().lat();
            var rhoPrimeDeg = this._visibleExtent.getNE().lat();

            //If the root geometry node hasn't been updated, 
            var theta0 = MapSphere.degToRad(theta0Deg);
            var rho0 = MapSphere.degToRad(rho0Deg);
            var thetaPrime = MapSphere.degToRad(thetaPrimeDeg);
            var rhoPrime = MapSphere.degToRad(rhoPrimeDeg);

            //Instruct the root node that it needs to update the geometry in the appropriate zone, if applicable.
            this._geometryRootNode.enhanceExtent(theta0, thetaPrime, rho0, rhoPrime);
        }

        return this._geometryRootNode.getMesh();        
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
    }

    

});