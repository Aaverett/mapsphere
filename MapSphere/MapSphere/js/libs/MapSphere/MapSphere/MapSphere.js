//MapSphere.js
//Aaron Averett

MapSphere.MapSphere = MapSphere.Class.extend({

    //This is the ellipsoid
    ellipsoid: null,

    //This is the container element in the document that will hold our render canvas.
    targetElement: null,

    //This is the canvas element that we'll be drawing on.
    canvas: null,

    //Constructor
    init: function(targetElement, options)
    {
        if (MapSphere.notNullNotUndef(options)) {

            //Did the user pass in an ellipsoid?
            if (MapSphere.notNullNotUndef(options.ellipsoid)) {
                this.ellipsoid = options.ellipsoid; //Yes?  Ok, hang on to it.
            }
            else {
                this.ellipsoid = new MapSphere.Math.Ellipsoid(); //No?  Ok, create a default one.
            }

            //Did the user pass in a canvas?
            if(MapSphere.notNullNotUndef(options.canvas))
            {
                this.canvas = options.canvas;
            }
        }

        //Make sure the user passed an actual target element.
        if (MapSphere.notNullNotUndef(targetElement)) {
            if (!(targetElement instanceof jQuery)) {
                targetElement = $(targetElement);
            }

            this.targetElement = targetElement;
        }

        //If we don't have a canvas yet...
        if(this.canvas == null)
        {
            this.canvas = $("<canvas>Goats</canvas>");

            this.targetElement.append(this.canvas);
        }
    }
})