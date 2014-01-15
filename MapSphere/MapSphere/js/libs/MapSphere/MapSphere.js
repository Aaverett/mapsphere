//MapSphere.js
//This is the main file for MapSphere, a library for rendering geographic information in three dimensions, in a manner conceptually similar to Google Earth.

//While there isn't any code here that's copied and pasted from OpenLayers, it's probably notable that I'm shamelessly borrowing some of the design patterns.

//Dependencies
//three.js
//Jquery ~1.10
//JqueryUI 

//Create the MapSphere namespace.
window.MapSphere = {
    scriptBasePath: "js/libs/MapSphere/",
    assetBasePath: "assets/"
};

//Set up the debugging business.
MapSphere.DEBUG = false;
MapSphere.debugPane = null;

//This is the set of scripts that will need to be loaded.  I'm borrowing this idea from OpenLayers
MapSphere.scriptFiles =
    [
        "Base/ClassInheritance.js",
        "Base/UIEventHost.js",
        "Base/Funcs.js",
        "Math/Ellipsoid.js",
        "Math/DetailTreeNode.js",
        "CameraControllers/CameraController.js",
        "CameraControllers/OrbitCameraController.js",
        "Geography/LngLat.js",
        "Geography/Envelope.js",
        "Layers/Layer.js",
        "Layers/BasicEllipsoidLayer.js",
        "Layers/VectorGeometryLayer.js",
        "Layers/ArcGISVectorLayer.js",
        "Decorations/Decoration.js",
        "Decorations/StaticTextureDecoration.js",
        "Decorations/ArcGISRESTServiceDecoration.js",
        "Decorations/ArcGISRESTServiceElevationDecoration.js",
        "Decorations/PushpinVectorDecoration.js",
        "Decorations/TiledServiceDecoration.js",
        "Decorations/OpenLayersTiledServiceDecoration.js",
        "MapSphere/MapSphere.js"
    ];

//Create namespaces within MapSphere
MapSphere.Math = {};
MapSphere.CameraControllers = {};
MapSphere.Geography = {};
MapSphere.Layers = {};
MapSphere.Decorations = {};
MapSphere.Constants = {};

MapSphere.Assets = new Array();

(function () {

    var scriptTags = new Array();

    for (var i = 0; i < MapSphere.scriptFiles.length; i++) {
        //Compose a script tag for each file.
        var scriptTag = "<script language=\"javascript\" type=\"text/javascript\" src=\"" + MapSphere.scriptBasePath + MapSphere.scriptFiles[i] + "\"></script>";

        //Add the tag to the document.
        document.write(scriptTag);
    }
})();
