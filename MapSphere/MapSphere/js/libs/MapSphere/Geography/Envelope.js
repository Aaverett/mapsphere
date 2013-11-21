//Envelope.js
//Aaron Averett
//This represents a geographic extent (a max and min latitude and longitude)

MapSphere.Geography.Envelope = MapSphere.Class.extend({
    _ne: null,
    _sw: null,

    init: function (sw, ne)
    {
        this._ne = ne;
        this._sw = sw;
    },

    getSW: function() {
        return this._sw;
    },

    getNE: function () {
        return this._ne;
    }
});