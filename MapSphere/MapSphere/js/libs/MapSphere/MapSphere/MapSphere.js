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

    fov: 90,

    minCullDistance: 0.1,
    maxCullDistance: 100000000,

    cameraController: null,

    ambientLight: null,
    sunLight: null,

    doTestGeometry: false,

    layers: new Array(),

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
                ellipsoid: this.ellipsoid
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
        this.sunLight.position.set(this.ellipsoid.getEquatorialRadius() * 10, 0, 0);

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

        this.cameraDoneMovingTimer = window.setTimeout(this.handleCameraDoneMovingTimeout.bind(this), 2000);
    },

    handleCameraDoneMovingTimeout: function (args) {
        
        //Request that each layer refresh its geometry.
        for(var i=0; i < this.layers.length; i++)
        {
            this.layers[i].refreshGeometry();
        }
    },

    resize: function (width, height) {
        //TODO: Implement resizing of the canvas
    },

    //Mouse Event handlers
    mouseDown: function (args) {
        this.cameraController.mouseDown(args);

        args.stopPropagation();
    },

    mouseUp: function (args) {
        this.cameraController.mouseUp(args);

        args.stopPropagation();
    },

    mouseClick: function (args) {
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
        if(args.allNewGeometry)
        {
            this.scene.remove(args.sender.getGeometry());
        }
    }
    //end of layer event handlers
})