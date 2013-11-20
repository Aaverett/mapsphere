//OrbitCameraController.js
//Aaron Averett
//This implements the orbit camera controller, which sort of mimics the well understood camera controls of most other 3D applications.  It should be familiar to the user.

MapSphere.CameraControllers.OrbitCameraController = MapSphere.CameraControllers.CameraController.extend({

    ellipsoid: null,

    maximumDepth: 0,
    maximumAltitude: 0,

    cameraLocation: null,
    cameraAltitude: 0,

    init: function (camera, options) {
        this._super(camera);

        this.ellipsoid = options.ellipsoid;

        if (MapSphere.notNullNotUndef(options.cameraLocation)) {
            this.cameraLocation = option.cameraLocation;
        }
        else this.cameraLocation = new MapSphere.Geography.LngLat(0, 0);


        this.updateCameraPosition();
    },

    updateCameraPosition: function () {
        //Step 1: transform the camera's polar coordinate location into a cartesian XYZ position.
        var position = this.ellipsoid.toCartesianWithLngLatElev(
            new MapSphere.Geography.LngLatElev(this.cameraLocation.lng(),
                                                this.cameraLocation.lat(),
                                                this.cameraAltitude));

        this.camera.position = position;

        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    }
});