//This is a height map decoration for the basic ellipsoid that loads its data from an ArcGIS REST API service.

MapSphere.Decorations.ArcGISRESTServiceElevationDecoration = MapSphere.Decorations.ArcGISRESTServiceDecoration.extend({
    init: function(options)
    {
        this._super(options);

        this._providesElevation = true;
    }
});