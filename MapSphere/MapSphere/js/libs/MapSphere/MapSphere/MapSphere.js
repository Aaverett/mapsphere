//MapSphere.js
//Aaron Averett

MapSphere.MapSphere = MapSphere.UIEventHost.extend({

    //This is the ellipsoid
    ellipsoid: null,

    //This is the container element in the document that will hold our render canvas.
    targetElement: null,

    //This is the canvas element that we'll be drawing on.
    canvas: null,

    scene: null,

    camera: null,

    renderer: null,

    fov: 60,

    minCullDistance: 0.1,
    maxCullDistance: 100000000,

    cameraController: null,

    ambientLight: null,
    sunLight: null,

    doTestGeometry: false,

    layers: new Array(),

    _visibleExtent: null,

    _cameraDoneMovingWait: 1000,

    _lastFrameTime: 0,
    _frameRate: 0,
    _minFrameRate: 0,
    _maxFrameRate: 0,
    _frameCount: 0,

    _lastMouseDownCoords: null,
    _clickTolerance: 1,

    //Constructor
    init: function (targetElement, options) {
        if (MapSphere.notNullNotUndef(options)) {

            //Did the user pass in an ellipsoid?
            if (MapSphere.notNullNotUndef(options.ellipsoid)) {
                this.ellipsoid = options.ellipsoid; //Yes?  Ok, hang on to it.
            }

            //Did the user pass in a canvas?
            if (MapSphere.notNullNotUndef(options.canvas)) {
                this.canvas = options.canvas;
            }

            //Did they pass in their own camera controller?
            if (MapSphere.notNullNotUndef(options.cameraController)) {
                this.cameraController = options.cameraController;
            }

            //Did they request the test geometry?
            if (MapSphere.notNullNotUndef(options.doTestGeometry)) {
                this.doTestGeometry = options.doTestGeometry;
            }

            //Did they pass in a layer var?
            if(MapSphere.notNullNotUndef(options.layers))
            {
                //Is it an array?
                if(options.layers instanceof Array)
                {
                    this.layers = options.layers;
                }
            }
        }

        //Do we have an ellipsoid?  No?  Ok, create a default (earth-size) one.
        if (this.ellipsoid == null) {
            this.ellipsoid = new MapSphere.Math.Ellipsoid();
        }

        //Make sure the user passed an actual target element.
        if (MapSphere.notNullNotUndef(targetElement)) {
            if (!(targetElement instanceof jQuery)) {
                targetElement = $(targetElement);
            }

            this.targetElement = targetElement;
        }

        //If we don't have a canvas yet...
        if (this.canvas == null) {
            this.canvas = $("<canvas></canvas>");

            this.canvas.width(this.targetElement.width());
            this.canvas.height(this.targetElement.height());

            this.targetElement.append(this.canvas);

            //Attach event listeners to the canvas.
            this.canvas.mousedown(this.mouseDown.bind(this));
            this.canvas.mouseup(this.mouseUp.bind(this));
            this.canvas.mousemove(this.mouseMove.bind(this));
            this.canvas.mouseenter(this.mouseEnter.bind(this));
            this.canvas.mouseleave(this.mouseLeave.bind(this));
            this.canvas.click(this.mouseClick.bind(this));
            this.canvas.on('contextmenu', this.suppressContextMenu.bind(this));
            this.canvas.mousewheel(this.mouseScroll.bind(this));

        }

        //Finally, initialize some member vars.
        this.maxCullDistance = this.ellipsoid.getEquatorialRadius() * 2; //The max cull distance is the farthest distance from the camera that gets rendered.

        //Now, initialize the 3D scene.
        this.initScene();

        //Init existing layers.
        this.initLayers();

        //Start the render loop.
        this.renderScene();
    },

    getAspectRatio: function () {
        var aspectRatio = this.canvas.width() / this.canvas.height();

        return aspectRatio;
    },

    initScene: function () {

        //Start by creating the renderer...
        var rendererOptions = {
            canvas: this.canvas.get(0),
            antialias: true,
            alpha: true
        };

        this.renderer = new THREE.WebGLRenderer(rendererOptions);

        this.camera = new THREE.PerspectiveCamera(
                this.fov, 
                this.getAspectRatio(), 
                this.minCullDistance, 
                this.maxCullDistance);

        this.scene = new THREE.Scene();

        var clearColor = new THREE.Color(0x000000);
        this.renderer.setClearColor(clearColor, 1);

        this.scene.add(this.camera);
        

        //Do we already have a camera controller?  No?  Ok, create a default one.
        if (this.cameraController == null) {
            var opts = {
                ellipsoid: this.ellipsoid,
                viewPortX: this.canvas.width(),
                viewPortY: this.canvas.height()
            };

            this.setCameraController(new MapSphere.CameraControllers.OrbitCameraController(this.camera, opts));
        }
        
        this.renderer.setSize(this.canvas.width(), this.canvas.height());


        //For testing purposes, it's nice to have some simple geometry that can be added to the scene.
        if (this.doTestGeometry) {
            var cube = new THREE.SphereGeometry(this.ellipsoid.getEquatorialRadius(), 36, 36);

            var material = new THREE.MeshLambertMaterial({
                map: THREE.ImageUtils.loadTexture("assets/bluemarble.jpg")});

            var mesh = new THREE.Mesh(cube, material);

            this.scene.add(mesh);
        }

        //Add the ambient light to the scene, so it's not just totally dark.
        this.ambientLight = new THREE.AmbientLight(0xaaaaaa);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.PointLight(0xffffff, 3, this.ellipsoid.getEquatorialRadius() * 15);
        this.sunLight.position.set(this.ellipsoid.getEquatorialRadius() * 7, this.ellipsoid.getEquatorialRadius() * -7, 0);

        this.scene.add(this.sunLight);

        this.projector = new THREE.Projector();
        this.raycaster = new THREE.Raycaster();
    },

    //This initializes all of the layers presently in the layers array.
    initLayers: function () {

        //Tell each layer to refresh its geometry.
        for (var i = 0; i < this.layers.length; i++) {
            this.layers[i].addEventListener("geometryChanged", this.handleLayerGeometryChanged.bind(this));

            this.layers[i].refreshGeometry();
        }
    },

    initLayer: function () {

    },

    renderScene: function () {
        requestAnimationFrame(this.renderScene.bind(this));
        this.renderer.render(this.scene, this.camera);

        //Update the framerate, performance stats, etc.
        this.updatePerformanceStatistics();
    },

    updatePerformanceStatistics: function()
    {
        var d = new Date();

        var t_millis = d.getTime();

        var deltaT = t_millis - this._lastFrameTime;

        this._lastFrameTime = t_millis;

        this._frameRate = 1000 / deltaT;

        //Don't start tracking this for the first second or so, while stuff gets initialized.
        if (this._frameCount > 60) {
            if (Math.round(this._minFrameRate) == 0 || this._frameRate < this._minFrameRate) {
                this._minFrameRate = this._frameRate;
            }

            if (this._frameRate > this._maxFrameRate) {
                this._maxFrameRate = this._frameRate;
            }
        }
        this._frameCount++;

        //Let anything that's listening know that we've updated our performance statistics.
        this.raiseEvent("performanceStatsUpdated");

        //If the debug flag is set, update the debug features window.
        if(MapSphere.DEBUG)
        {
            MapSphere.updateDebugOutput("framerate", Math.round(this._frameRate * 10) / 10);
            MapSphere.updateDebugOutput("min_framerate", Math.round(this._minFrameRate * 10) / 10);
            MapSphere.updateDebugOutput("max_framerate", Math.round(this._maxFrameRate * 10) / 10);
        }

    },

    setCameraController: function(newCameraController) {

        //Actually set the camera controller.
        this.cameraController = newCameraController;

        //Hook up to the controller's events.
        this.cameraController.addEventListener("cameraMoved", this.handleCameraMoved.bind(this), null);
    },

    handleCameraMoved: function(args) {
        //The funny thing about the camera moving is that it sometimes moves more than once.

        //If there's already a camera moving timer set...
        if (this.cameraDoneMovingTimer != null)
        {
            window.clearTimeout(this.cameraDoneMovingTimer);
            this.cameraDoneMovingTimer = null;
        }

        this._visibleExtent = args.extent;

        this.cameraDoneMovingTimer = window.setTimeout(this.handleCameraDoneMovingTimeout.bind(this), this._cameraDoneMovingWait);
    },

    handleCameraDoneMovingTimeout: function (args) {
        
        //Request that each layer refresh its geometry.
        for(var i=0; i < this.layers.length; i++)
        {
            this.layers[i].setVisibleExtent(this._visibleExtent);
            this.layers[i].refreshGeometry();
        }
    },

    resize: function (width, height) {
        //TODO: Implement resizing of the canvas
    },

    //Mouse Event handlers
    mouseDown: function (args) {
        this._lastMouseDownCoords = { x: args.offsetX, y: args.offsetY };

        this.cameraController.mouseDown(args);

        args.stopPropagation();
    },

    mouseUp: function (args) {
        this.cameraController.mouseUp(args);

        args.stopPropagation();
    },

    mouseClick: function (args) {

        var clickX = args.offsetX;
        var clickY = args.offsetY;

        //Make sure that the location the user clicked is within the tolerance range for a single click.  
        if (clickX <= this._lastMouseDownCoords.x + 1 &&
            clickX >= this._lastMouseDownCoords.x - 1 &&
            clickY >= this._lastMouseDownCoords.y + 1 && 
            clickY >= this._lastMouseDownCoords.y - 1)
        {
            var w = 0;
        }

        args.stopPropagation();
    },

    mouseMove: function (args) {
        this.cameraController.mouseMove(args);
    },

    mouseEnter: function (args) {
        this.cameraController.mouseEnter(args);
    },

    mouseLeave: function (args) {
        this.cameraController.mouseLeave(args);
    },

    suppressContextMenu: function (args) {
        return false;
    },

    mouseScroll: function (event, delta, deltaX, deltaY) {
        this.cameraController.mouseScroll(delta);
    },
    //End of mouse event handlers

    //Layer maninpulation
    addLayer: function(layer)
    {
        layer.addEventListener("geometryChanged", this.handleLayerGeometryChanged.bind(this));
        this.layers.push(layer);
        layer.setVisibleExtent(this.cameraController.getCameraVisibleExtent());
        layer.refreshGeometry();

        var mesh = layer.getMesh();

        this.scene.add(mesh);
    },

    removeLayer: function()
    {

    },
    //End of layer manipulation

    //Event handlers for layer events
    handleLayerGeometryChanged: function(args) {
        
        if (args.oldMesh != args.newMesh)
        {
            this.scene.add(args.newMesh);
            this.scene.remove(args.oldMesh);
        }
    }
    //end of layer event handlers
})