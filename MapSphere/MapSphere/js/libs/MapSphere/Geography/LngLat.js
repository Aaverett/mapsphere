//LngLat.js
//Aaron Averett
//This represents an X/Y coordinate on the ellipsoid surface.

MapSphere.Geography.LngLat = MapSphere.Class.extend({
    _latitude: 0,
    _longitude: 0,

    init: function (x, y) {
        this._latitude = y;
        this._longitude = x;

        if (this._latitude > 90) this._latitude = 90;
        if (this._latitude < -90) this._latitude = -90;

        if (this._longitude < -180) this._longitude = -180;
        if (this._longitude > 180) this._longitude = 180;
    },

    lng: function () {
        return this._longitude;
    },

    lat: function () {
        return this._latitude;
    }
});

MapSphere.Geography.LngLatElev = MapSphere.Geography.LngLat.extend({

    _altitude: 0,

    init: function (x, y, z) {
        this._super(x, y);

        if (MapSphere.notNullNotUndef(z))
        {
            this._altitude = z;
        }
    },

    alt: function () {

        return this._altitude;
    },

    elev: function () {
        return this.alt();
    }
});