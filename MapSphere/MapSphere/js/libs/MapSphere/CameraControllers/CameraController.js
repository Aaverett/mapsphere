MapSphere.CameraControllers.CameraController = MapSphere.UIEventHost.extend({
    //Instance vars
    camera: null,

    //We keep track of the mouse position
    lastMouseX: null,
    lastMouseY: null,

    //We also keep track of the button state
    mouseButtonState: [false, false, false],

    init: function (camera) {
        this.camera = camera;
    },

    mouseEnter: function (args) {

    },

    mouseLeave: function (args) {
    },

    mouseDown: function (args) {
        this.mouseButtonState[args.button] = true;

        //Update for the button state.
        this.mouseButtonStateChanged();
    },

    mouseUp: function (args) {
        this.mouseButtonState[args.button] = false;

        this.mouseButtonStateChanged();
    },

    mouseMove: function (args) {
        var canDoDelta = true;

        if (this.lastMouseX == null) {
            canDoDelta = false;
            this.lastMouseX = args.clientX;
        }

        if (this.lastMouseY == null) {
            canDoDelta = false;
            this.lastMouseY = args.clientY;
        }

        var deltaX = args.clientX - this.lastMouseX;
        var deltaY = args.clientY - this.lastMouseY;

        this.mouseMoved(deltaX, deltaY);

        this.lastMouseX = args.clientX;
        this.lastMouseY = args.clientY;
    },

    mouseScroll: function(event, delta, deltaX, deltaY) {
        this.mouseScrolled(delta); 
    },

    mouseMoved: function (x, y) {
        //This default implementation doesn't do anything with this.
    },

    mouseButtonStateChanged: function () {
        //This default implementation doesn't do anything with this.
    },

    mouseScrolled: function(delta)
    {
        //The default implementation doesn't actually do anything with the event.
    },

    updateCameraPosition: function () {
        //In the default implementation, we do nothing.
    }
});