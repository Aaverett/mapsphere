//OrbitCameraController.js
//Aaron Averett
//This implements the orbit camera controller, which sort of mimics the well understood camera controls of most other 3D applications.  It should be familiar to the user.

MapSphere.CameraControllers.OrbitCameraController = MapSphere.CameraControllers.CameraController.extend({

    ellipsoid: null,

    minimumAltitude: 0,
    maximumAltitude: 0,

    cameraLocation: null,
    cameraAltitude: 5000000,

    zoomSteps: 100,

    init: function (camera, options) {
        this._super(camera);

        this.ellipsoid = options.ellipsoid;

        //Initialize our altitude and its upper and lower bounds.
        this.minimumAltitude = this.ellipsoid.getEquatorialRadius() - (this.ellipsoid.getEquatorialRadius() * 0.1);
        this.maximumAltitude = this.ellipsoid.getEquatorialRadius() * 2;
        this.cameraAltitude = this.minimumAltitude + ((this.maximumAltitude - this.minimumAltitude) / 2)

        if (MapSphere.notNullNotUndef(options.cameraLocation)) {
            this.cameraLocation = option.cameraLocation;
        }
        else this.cameraLocation = new MapSphere.Geography.LngLatElev(0, 0, this.cameraAltitude);

        if (MapSphere.notNullNotUndef(options.zoomSteps))
        {
            this.zoomSteps = options.zoomSteps;
        }

        this.panToLngLatElev(this.cameraLocation);
    },

    updateCameraPosition: function () {
        //Step 1: transform the camera's polar coordinate location into a cartesian XYZ position.
        var position = this.ellipsoid.toCartesianWithLngLatElev(
            new MapSphere.Geography.LngLatElev(this.cameraLocation.lng(),
                                                this.cameraLocation.lat(),
                                                this.cameraAltitude));

        this.camera.position = position;

        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    },

    setCameraLocation: function(newLocation)
    {
        this.cameraLocation = newLocation;

        this.updateCameraPosition();
    },

    mouseMoved: function (x, y) {
        if(this.mouseButtonState[0])
        {
            this.panMapWithPixelDelta(x, y);
        }
    },

    panMapWithPixelDelta: function(x, y)
    {
        var deltaDegX = x * -0.1;
        var deltaDegY = y * 0.1;

        var curX = this.cameraLocation.lng();
        var curY = this.cameraLocation.lat();

        var newX = curX + deltaDegX;
        var newY = curY + deltaDegY;

        this.panToCoords(newX, newY, this.cameraAltitude);

        $("#outspan2").text(newX + " " + newY);
    },

    panToLngLatElev: function(lngLatElev)
    {
        //Set our official location as the new set of coords/altitude
        this.cameraLocation = lngLatElev; // new MapSphere.Geography.LngLatElev(lon, lat, alt);

        var lat = this.cameraLocation.lat();
        var lon = this.cameraLocation.lng();
        var alt = this.cameraLocation.elev();

        var radius = this.ellipsoid.getPlanetRadiusAtLatitude(lat);

        var pX, pY, pZ;

        pZ = Math.sin(MapSphere.degToRad(lat));
        r2 = Math.cos(MapSphere.degToRad(lat));

        pX = r2 * Math.cos(MapSphere.degToRad(lon));
        pY = r2 * Math.sin(MapSphere.degToRad(lon));

        var gX, gY, gZ;
        var cX, cY, cZ;

        gX = radius * pX;
        gY = radius * pY;
        gZ = radius * pZ;

        cX = (radius + alt) * pX;
        cY = (radius + alt) * pY;
        cZ = (radius + alt) * pZ;

        this.camera.position = new THREE.Vector3(cX, cY, cZ);

        //This business took me like two whole days to figure out.  Each quaternion represents a rotation about a given axis.
        var quaternion1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), MapSphere.degToRad(90 - lat)); //Rotate about the camera's X axis.

        var quaternion2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), MapSphere.degToRad(lon + 90)); //Rotate about the camera's Z axis.

        var quaternion3 = quaternion2.multiply(quaternion1); //Combine the two rotations.  Note that this isn't commutative, so doing it the other way gives wacky results.


        //this.camera.rotation.setFromQuaternion(quaternion7); //Set the camera's euler rotation from our quaternion.
        this.camera.rotation.setFromQuaternion(quaternion3); //Set the camera's euler rotation from our quaternion.

        //this.cameraDoneMoving();

        //this.panToCoords(lngLatElev.lng(), lngLatElev.lat(), lngLatElev.elev());
    },

    panToCoords: function(lng, lat, elev)
    {
        var lle = new MapSphere.Geography.LngLatElev(lng, lat, elev);

        this.panToLngLatElev(lle);
    },

    mouseScrolled: function(delta)
    {
        //The delta value is inverted for our purposes, so we'll flip it over first.
        var trueDelta = -1.0 * delta;

        var newAltitude = this.getNewAltitude(trueDelta);

        //Bounds check and correction
        if (newAltitude < this.minimumAltitude) {
            newAltitude = this.minimumAltitude;
        }

        if (newAltitude > this.maximumAltitude) {
            newAltitude = this.maximumAltitude;
        }

        var newLLE = new MapSphere.Geography.LngLatElev(this.cameraLocation.lng(), this.cameraLocation.lat(), this.cameraLocation.elev());
        this.panToLngLatElev(newLLE);
    },

    getNewAltitude: function (delta) {

        var newAltitude = Math.pow(this.cameraLocation.elev(),  1 + (delta * (1 / this.zoomSteps)));

        return newAltitude;

    }
});