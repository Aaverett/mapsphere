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
            this.lastMouseX = args.offsetX;
        }

        if (this.lastMouseY == null) {
            canDoDelta = false;
            this.lastMouseY = args.offsetY;
        }

        var deltaX = args.offsetX - this.lastMouseX;
        var deltaY = args.offsetY - this.lastMouseY;

        this.mouseMoved(deltaX, deltaY);

        this.lastMouseX = args.offsetX;
        this.lastMouseY = args.offsetY;
    },

    mouseMoved: function (x, y) {
        //This default implementation doesn't do anything with this.
    },

    mouseButtonStateChanged: function () {
        //This default implementation doesn't do anything with this.


        var t = "";

        for (var i = 0; i < this.mouseButtonState.length; i++) {
            if (this.mouseButtonState[i]) t += "down";
            else t += "up";

            if (i + 1 < this.mouseButtonState.length) t += ", ";
        }

        $("#outspan").text(t);
    },

    updateCameraPosition: function () {
        //In the default implementation, we do nothing.
    }
});