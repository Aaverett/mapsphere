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

    //These are the Y and Z (pitch and yaw) angles (in radians) for the camera, relative to looking straight down at the ground.
    cameraRotX: 0,
    cameraRotY: 0,
    cameraRotZ: 0,

    init: function (camera, options) {
        this._super(camera, options);

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
            this.orbitMapWithPixelDelta(x, y);
        }
        else if(this.mouseButtonState[1])
        {
            this.rollCameraDirectionWithPixelData(x, y);
        }
        else if(this.mouseButtonState[2])
        {
            this.panCameraDirectionWithPixelData(x, y);
        }
    },

    orbitMapWithPixelDelta: function(x, y)
    {
        var curElev = this.cameraLocation.elev();

        var deltaDegX = 0, deltaDegY = 0;

        //The real way we do this is figure out the ratio of the distance the user dragged to the dimensions of the visible area.
        if (this.viewPortX != 0 && this.viewPortY != 0)
        {
            var fractionX = x / this.viewPortX;
            var fractionY = y / this.viewPortY;

            var visibleExtent = this.getCameraVisibleExtent();

            var spanX = visibleExtent.getNE().lng() - visibleExtent.getSW().lng();
            var spanY = visibleExtent.getNE().lat() - visibleExtent.getSW().lat();

            deltaDegX = -1.0 * spanX * fractionX;
            deltaDegY = spanY * fractionY;
        }
        else
        {
            //Prevent a problem if we for some reason don't know the dimensions of the viewport.
            deltaDegX = x * -0.1;
            deltaDegY = y * 0.1;
        }

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
        
        var tmpQuaternion = new THREE.Quaternion();
        tmpQuaternion.set(-1 * this.cameraRotX, - 1 * this.cameraRotY, -1 * this.cameraRotZ, 1).normalize();

        var q4 = quaternion3.multiply(tmpQuaternion);

        this.camera.rotation.setFromQuaternion(q4, this.camera.rotation.order);
        
        this.cameraMoved();

        //Display the position in the debug pane, if applicable.
        if(MapSphere.DEBUG)
        {
            MapSphere.updateDebugOutput("orbitcam_theta", MapSphere.degToRad(lon));
            MapSphere.updateDebugOutput("orbitcam_rho", MapSphere.degToRad(lat));
            MapSphere.updateDebugOutput("orbitcam_alt", alt);
            MapSphere.updateDebugOutput("orbitcam_rotX", this.cameraRotX);
            MapSphere.updateDebugOutput("orbitcam_rotZ", this.cameraRotY);
        }

        //this.panToCoords(lngLatElev.lng(), lngLatElev.lat(), lngLatElev.elev());
    },

    panToCoords: function(lng, lat, elev)
    {
        var lle = new MapSphere.Geography.LngLatElev(lng, lat, elev);

        this.panToLngLatElev(lle);
    },

    panCameraDirectionWithPixelData: function(x, y)
    {
        this.cameraRotX += y * 0.005; //Pitch
        this.cameraRotY += x * 0.005; //Yaw
        //The camera doesn't roll.

        this.panToLngLatElev(this.cameraLocation);
    },

    rollCameraDirectionWithPixelData: function(x, y)
    {
        var dist = Math.sqrt(x * x + y * y);

        this.cameraRotZ += x * 0.005;

        this.panToLngLatElev(this.cameraLocation);
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