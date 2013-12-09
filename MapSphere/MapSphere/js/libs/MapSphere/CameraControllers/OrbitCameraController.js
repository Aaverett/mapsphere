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

    allow360Pan: false,

    init: function (camera, options) {
        this._super(camera);

        this.ellipsoid = options.ellipsoid;

        //Initialize our altitude and its upper and lower bounds.
        this.minimumAltitude =  -1.0 * (this.ellipsoid.getEquatorialRadius() * 0.1);
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

        if (options.allow360Pan) this.allow360Pan = true;

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
        var curElev = this.cameraLocation.elev();

        //The distance in the lon/lat directions that we move the camera is 

        var totalAltRange = this.maximumAltitude - this.minimumAltitude;

        var altRelMin = totalAltRange - (curElev - this.minimumAltitude);

        var fraction = altRelMin / (totalAltRange);

        var deltaDegX = x * -0.1;
        var deltaDegY = y * 0.1;

        var curX = this.cameraLocation.lng();
        var curY = this.cameraLocation.lat();
        

        var newX = curX + deltaDegX;
        var newY = curY + deltaDegY;

        this.panToCoords(newX, newY, curElev);
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

        this.cameraMoved();

        //Display the position in the debug pane, if applicable.
        if(MapSphere.DEBUG)
        {
            MapSphere.updateDebugOutput("orbitcam_theta", MapSphere.degToRad(lon));
            MapSphere.updateDebugOutput("orbitcam_rho", MapSphere.degToRad(lat));
            MapSphere.updateDebugOutput("orbitcam_alt", alt);
        }

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

        var newLLE = new MapSphere.Geography.LngLatElev(this.cameraLocation.lng(), this.cameraLocation.lat(), newAltitude);
        this.panToLngLatElev(newLLE);
    },

    getNewAltitude: function (delta) {

        var newAltitude = Math.pow(this.cameraLocation.elev(),  1 + (delta * (1 / this.zoomSteps)));

        return newAltitude;

    },

    //Override the useless default non-function.
    getCameraVisibleExtent: function()
    {
        var extent = {
            maxx: this.cameraLocation.lng(),
            minx: this.cameraLocation.lng(),
            maxy: this.cameraLocation.lat(),
            miny: this.cameraLocation.lat()
        };
        
        var retExtent;

        var planetRadius = this.ellipsoid.getEquatorialRadius();

        var cameraElev = this.cameraLocation.elev();

        var orbitRadius = planetRadius + cameraElev;

        //This is a quick and dirty method of doing this, but should work for now.  
        //Redo this later, if needed.
        var fovH = this.camera.fov;
        var fovV = fovH / this.camera.aspect;

        //This can sometimes be NaN.
        if (isNaN(fovH)) {
            fovH = fovV * 1.3333; //Give it a sane and reasonable value
        }

        var halfAngleV = fovV / 2;
        var halfAngleH = fovH / 2;
        var hAVRad = MapSphere.degToRad(halfAngleV);
        var hAHRad = MapSphere.degToRad(halfAngleH);

        var surfaceSwathHalfWidth = Math.sin(hAHRad) * this.cameraLocation.elev();
        var surfaceSwathHalfHeight = Math.sin(hAVRad) * this.cameraLocation.elev();
        var orbitSwathHalfWidth = Math.sin(hAHRad) * orbitRadius;
        var orbitSwathHalfHeight = Math.sin(hAVRad) * orbitRadius;

        if(orbitSwathHalfHeight >= planetRadius || orbitSwathHalfWidth >= planetRadius)
        {
            extent.maxx = 180.0;
            extent.minx = -180.0;
            extent.maxy = 90.0;
            extent.miny = -90.0;
        }
        else
        {
            //We're in close enough that the camera can't see the entire world.  Let's figure out what it can see.
            sinThetaW = surfaceSwathHalfWidth / planetRadius;
            var thetaW = Math.asin(sinThetaW);

            var thetaWDeg = MapSphere.radToDeg(thetaW);

            sinThetaH = surfaceSwathHalfHeight / planetRadius;
            var thetaH = Math.asin(sinThetaH);
            var thetaHDeg = MapSphere.radToDeg(thetaH);

            extent.minx -= 3 * thetaWDeg;
            extent.maxx += 3 * thetaWDeg;
            extent.miny -= 3 * thetaHDeg;
            extent.maxy += 3 * thetaHDeg;
        }

        var sw = new MapSphere.Geography.LngLatElev(extent.minx, extent.miny);
        var ne = new MapSphere.Geography.LngLatElev(extent.maxx, extent.maxy);

        retExtent = new MapSphere.Geography.Envelope(sw, ne);

        return retExtent;
    }
});