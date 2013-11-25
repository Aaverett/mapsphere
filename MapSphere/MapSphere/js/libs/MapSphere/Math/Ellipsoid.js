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

    toCartesianWithLngLatElev: function(lngLatElev)
    {
        return this.toCartesianWithLngLatElevValues(lngLatElev.lng(),
                                                    lngLatElev.lat(),
                                                    lngLatElev.elev(), true);
    },

    toCartesianWithLngLatElevValues: function (lon, lat, elev, convertToRadians) {
        var x, y, z;
        var latRad;
        var lonRad;
               
        if (convertToRadians == false) {
            latRad = lat;
            lonRad = lon;
        }
        else
        {
            latRad = MapSphere.degToRad(lat);
            lonRad = MapSphere.degToRad(lon);
        }

        //Get the full radius of our orbit at the given altitude.
        var radius = this.getPlanetRadiusAtLatitude(lat) + elev;

        //Compute the Z value
        z = Math.sin(latRad) * radius;

        //Get the radius of our circle on the X/Y plane that given parallel describes.
        var radiusXY = Math.cos(latRad) * radius;

        //Compute the X and Y components.
        x = Math.cos(lonRad) * radiusXY;
        y = Math.sin(lonRad) * radiusXY;

        //Produce a vector object.
        var v = new THREE.Vector3(x, y, z);

        return v;
    }

});