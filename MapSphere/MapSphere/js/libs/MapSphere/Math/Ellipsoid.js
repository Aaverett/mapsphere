//Ellipsoid.js
//Aaron Averett
// This describes an ellipsoid that (very) roughly models the shape of the earth.
//It accepts arguments that could conceivably allow it to model the shape of another similarly ellipsoidal planet.

MapSphere.Math.Ellipsoid = MapSphere.Class.extend({

    equatorialRadius: 6378137,
    polarRadius: 6356752.3142,
    inverseFlattening: 298.257,

    //Constructor
    init: function (equatorialRadius, polarRadius, inverseFlattening) {

        if (MapSphere.notNullNotUndef(equatorialRadius)) {
            this.equatorialRadius = equatorialRadius;
        }

        if (MapSphere.notNullNotUndef(polarRadius)) {
            this.polarRadius = polarRadius;
        }

        if (MapSphere.notNullNotUndef(inverseFlattening)) {
            this.inverseFlattening = inverseFlattening;
        }
    },

    //Takes as input a given latitude, and returns an approximation of the radius of the ellipsoid at that radius.
    //Taken from an equation found here:
    //http://www.mathworks.com/help/aeroblks/radiusatgeocentriclatitude.html
    getPlanetRadiusAtLatitude: function (lat) {
        var rad;
        var latRadians = MapSphere.degToRad(lat);

        var f = 1 / this.inverseFlattening;

        var er2 = Math.pow(this.equatorialRadius, 2);

        var p1 = 1 / Math.pow((1 - f), 2) - 1;

        var bot = 1 + p1 * Math.pow(Math.sin(latRadians), 2);

        rad = Math.sqrt(er2 / bot);

        return rad;
    },

    getEquatorialRadius: function () {
        return this.equatorialRadius;
    },

    toCartesianWithLngLat: function (lngLat) {
        var lle = new MapSphere.Geography.LngLatElev(lngLat.lng(), lngLat.lat(), 0);

        return this.toCartesianWithLngLatElev();
    },

    toCartesianWithLngLatElev: function (lngLatElev) {
        var radius = this.getPlanetRadiusAtLatitude(lngLatElev.lat());

        var pX, pY, pZ;

        pZ = Math.sin(MapSphere.degToRad(lngLatElev.lat()));
        r2 = Math.cos(MapSphere.degToRad(lngLatElev.lat()));

        pX = r2 * Math.cos(MapSphere.degToRad(lngLatElev.lng()));
        pY = r2 * Math.sin(MapSphere.degToRad(lngLatElev.lng()));

        var gX, gY, gZ;
        var cX, cY, cZ;

        gX = radius * pX;
        gY = radius * pY;
        gZ = radius * pZ;

        cX = (radius + lngLatElev.lat()) * pX;
        cY = (radius + lngLatElev.lat()) * pY;
        cZ = (radius + lngLatElev.lat()) * pZ;

        var vec3Pos = new THREE.Vector3(cX, cY, cZ);

        return vec3Pos;
    }

});