//VectorGeometryLayer.js
//This is a layer that represents vector geometry in the scene.  This is intended as an abstract class, with instantiable classes being
//needed to actually use it.

//Establish the supported geometry types.  Other could conceivably add to this list.
MapSphere.Constants.GeometryType_Point = 0;
MapSphere.Constants.GeometryType_Polyline = 1;
MapSphere.Constants.GeometryType_Polyline = 2;
MapSphere.Constants.GeometryType_PointCloud = 3;

MapSphere.Layers.VectorGeometryLayer = MapSphere.Layers.Layer.extend({
    
    //Local vars
    _baseAltitude: 0,

    _features: null,
    _featureIndex: null,
    _featureWrappers: null,
    _zField: null,
    _pkField: null,

    _geometryType: MapSphere.Constants.GeometryType_Point,

    //The mesh or collection thereof that participates in the scene.
    _mesh: null,

    init: function(options)
    {
        //Do the base initialization.
        this._super(options);

        if(MapSphere.notNullNotUndef(options.baseAltitude))
        {
            this._baseAltitude = 0;
        }

        //Initialize the collection of features.
        this._features = new Array();
        this._featureWrappers = new Array();
        this._featureIndex = {};

        this._mesh = new THREE.Object3D();
    },

    getFeaturePK: function(feature)
    {
        var ret = feature;

        if (this._pkField != null)
        {
            ret = feature[this._pkField];
        }

        return feature[this._pkField];
    },

    haveFeature: function(feature)
    {
        var ret = false;

        if(MapSphere.notNullNotUndef(this._featureIndex[this.getFeaturePK(feature)]))
        {
            ret = true;
        }
        else
        {
            var i = 0;
        }

        return ret;
    },

    addFeature: function(feature)
    {
        if(!this.haveFeature(feature))
        {
            this._features.push(feature);

            var pkval = this.getFeaturePK(feature);

            this._featureIndex[pkval] = feature;

            var wrapper = new MapSphere.Layers.VectorGeometryLayerFeatureWrapper(feature);

            this.populateFeatureWrapper(wrapper);

            this.addFeatureWrapper(wrapper);
        }        
    },

    //Batch adding features.  This should always be used preferentially over individual calls to addFeature, if possible, as it's usually faster in most real implementations.
    addFeatures: function(features)
    {
        var wrappers = new Array();

        for(var i = 0; i < features.length; i++)
        {
            if(!this.haveFeature(features[i]))
            {
                this._features.push(features[i]);

                var pkval = this.getFeaturePK(features[i]);

                this._featureIndex[pkval] = features[i];

                var wrapper = new MapSphere.Layers.VectorGeometryLayerFeatureWrapper(features[i]);

                wrappers.push(wrapper);
            }
        }

        //Populate the feature wrappers (generate geometry)
        this.populateFeatureWrappers(wrappers);

        this.addFeatureWrappers(wrappers);
    },

    removeFeature: function(feature)
    {
        if(this.haveFeature(feature))
        {
            var ind = $.inArray(feature, this._features);
            var ind2 = $.inArray(feature, this._featureIndex);

            this._features.splice(ind, 1);
            this._featureIndex.splice(ind2, 1);
            var wrapper = this._featureWrappers[ind];

            this.removeFeatureWrapper(wrapper);
        }
    },

    addFeatureWrapper: function(wrapper)
    {
        this._featureWrappers.push(wrapper);

        this.featureWrappersChanged(wrapper);
    },

    addFeatureWrappers: function(wrappers)
    {
        this._featureWrappers = this._featureWrappers.concat(wrappers);

        this.featureWrappersChanged(wrappers);
    },

    //This handles the process of synching the geometry actually in the scene with the geometry our backend represents.
    featureWrappersChanged: function(changed)
    {
        if (Object.prototype.toString.call(changed) !== "[object Array]")
        {
            var a = new Array();
            a.push(changed);
        }

        //In the base implementation, we add new wrappers' meshes to the scene, and remove the meshes that aren't in the canonical list.
        for(var i=0; i < changed.length; i++)
        {
            var wrapper = changed[i];
            var pos = $.inArray(wrapper, this._featureWrappers)

            if(pos > -1)
            {
                //Ok, it's in the set of good wrappers.  Add the mesh to the scene.
                this._mesh.add(wrapper.getMesh());
            }
            else
            {
                //It's not in the set of wrappers. 
                this._mesh.remove(wrapper.getMesh());
            }
        }
    },
    
    removeFeatureWrapper: function(wrapper)
    {
        this._mesh.remove(wrapper.getMesh());

        var ind = $.inArray(wrapper, this._featureWrappers);

        this._featureWrappers.splice(ind, 1);
    },

    refreshGeometry: function()
    {
        this._super();
    },

    populateFeatureWrapper: function(wrapper)
    {

    },

    populateFeatureWrappers: function(wrappers)
    {
        for (var i = 0; i < wrappers.length; i++) {
            this.populateFeatureWrapper(wrappers[i]);
        }
    },

    setVisibleExtent: function (extent)
    {
        this._super(extent);

        this.refreshGeometry();
    },

    getCurrentLOD: function()
    {
        var currentExtent = this.getVisibleExtent();

        var theta0Deg = this._visibleExtent.getSW().lng();
        var thetaPrimeDeg = this._visibleExtent.getNE().lng();
        var rho0Deg = this._visibleExtent.getSW().lat();
        var rhoPrimeDeg = this._visibleExtent.getNE().lat();

        var deltaThetaDeg = thetaPrimeDeg - theta0Deg;
        var deltaRhoDeg = rhoPrimeDeg - rho0Deg;

        var deltaThetaRad = MapSphere.degToRad(deltaThetaDeg);
        var deltaRhoRad = MapSphere.degToRad(deltaRhoDeg);

        var lod = 0;
        var width, height;
        do 
        {
            lod++;

            width = (Math.PI * 2) / Math.pow(16, lod);
            height = (Math.PI) / Math.pow(16, lod);
        }
        while(deltaRhoRad > height || deltaThetaRad > width);

        return lod;
    }
});

MapSphere.Layers.VectorGeometryLayerFeatureWrapper = MapSphere.UIEventHost.extend({
    
    _feature: null,
    _geometry: null,
    _mesh: null,
    _material: null,

    init: function(feature)
    {
        this._feature = feature;
    },

    getMesh: function()
    {
        return this._mesh;
    },

    setMesh: function(mesh)
    {
        this._mesh = mesh;
    },

    setGeometry: function(geometry)
    {
        this._geometry = geometry;
    },

    getGeometry: function()
    {
        return this._geometry;
    },

    getFeature: function()
    {

        return this._feature;
    },

    setFeature: function(value)
    {
        this._feature = value;
    },

    setMaterial: function(value)
    {
        this._material = value;
    },

    getMaterial: function()
    {
        return this._material;
    },

    //Handy default create-the-mesh method.  Most implementations will probably just need to do this...
    createDefaultMesh: function()
    {
        this._mesh = new THREE.Mesh(this._geometry, this._material);
    },

    pickWithRayCaster: function()
    {

    }
});