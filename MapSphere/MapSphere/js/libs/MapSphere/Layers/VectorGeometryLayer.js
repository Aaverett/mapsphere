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

        this._mesh = new THREE.Object3D();
    },

    haveFeature: function(feature)
    {
        var ret = false;

        //If there's a PK field set...
        if(this._pkField != null)
        {
            var ind = $.inArray(feature, this._features)
            if(ind != -1)
            {
                ret = true;
            }
        }
        else
        {
            //Theoretically, we could compare to every single feature in the collection, but that would be unacceptably slow for large values of N.
        }

        return ret;
    },

    addFeature: function(feature)
    {
        if(!this.haveFeature(feature))
        {
            this._features.push(feature);

            var wrapper = new MapSphere.Layers.VectorGeometryLayerFeatureWrapper(feature);

            this.populateFeatureWrapper(wrapper);

            this.addFeatureWrapper(wrapper);
        }        
    },

    removeFeature: function(feature)
    {
        if(this.haveFeature(feature))
        {
            var ind = $.inArray(feature, this._features);

            this._features.splice(ind, 1);
            var wrapper = this._featureWrappers[ind];

            this.removeFeatureWrapper(wrapper);
        }
    },

    addFeatureWrapper: function(wrapper)
    {
        this._featureWrappers.push(wrapper);

        this._mesh.add(wrapper.getMesh());
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

    setVisibleExtent: function (extent)
    {
        this._super(extent);

        this.refreshGeometry();
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
    }
});