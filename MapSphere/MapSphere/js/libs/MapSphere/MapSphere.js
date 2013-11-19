//MapSphere.js
//This is the main file for MapSphere, a library for rendering geographic information in three dimensions, in a manner conceptually similar to Google Earth.

//Dependencies
//three.js
//Jquery ~1.10
//JqueryUI 

//Create the MapSphere namespace.
window.MapSphere = {
    scriptBasePath: "js/libs/MapSphere/"
};

//This is the set of scripts that will need to be loaded.
MapSphere.scriptFiles =
    [
        "Base/ClassInheritance.js",
        "Base/UIEventHost.js",
        "Base/Funcs.js",
        "MapSphere/MapSphere.js"
    ];

(function () {
    
    var scriptTags = new Array();

    for(var i=0; i < MapSphere.scriptFiles.length; i++)
    {
        //Compose a script tag for each file.
        var scriptTag = "<script language=\"javascript\" type=\"text/javascript\" src=\"" + MapSphere.scriptBasePath + MapSphere.scriptFiles[i] + "\"></script>";

        //Add the tag to the document.
        document.write(scriptTag);
    }
})();
