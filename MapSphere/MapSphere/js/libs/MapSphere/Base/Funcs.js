﻿//Funcs.js
//Aaron Averett
//This contains semi-global functions that will be needed througout MapSphere, but we don't want to collide with other libs.


MapSphere.notNullNotUndef = function (obj) {
    if (obj == undefined) return false;

    if (obj == null) return false;

    return true;
};

//Converts degrees to radians
MapSphere.degToRad = function (deg) {
    var rad;

    rad = deg * (1 / (180.0 / Math.PI));

    return rad;
}

//Converts radians to degrees
MapSphere.radToDeg = function (rad) {

    deg = rad * (180 / Math.PI);

    return deg;
}

MapSphere.simplestVertexShader = "varying vec2 vUv;\r\n" +
    "varying vec3 vNormal;\r\n" +
    "varying vec3 vViewPosition;\r\n" +
    "void main() {\r\n" +
    "    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\r\n" +
    "    vUv = uv;\r\n" +
    "    vNormal = normalize( normalMatrix * normal );\r\n" +
    "    vViewPosition = -mvPosition.xyz;\r\n" +
    "    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\r\n" +
    "}\r\n";

MapSphere.stackTextures = function(textures)
{
    //Before we start creating stuff, we need to do some planning.  How big is our biggest texture?
    var maxW=-1, maxH = -1;

    for (var i = 0; i < textures.length; i++)
    {
        if (MapSphere.notNullNotUndef(textures[i])) {
            if (textures[i].naturalWidth > maxW) maxW = textures[i].naturalWidth;

            if (textures[i].naturalHeight > maxH) maxH = textures[i].naturalHeight
        }
    }

    var canvas = document.createElement("canvas");
    canvas.width = maxW;
    canvas.height = maxH;

    var ctx = canvas.getContext("2d");
    for(var i=0; i<textures.length; i++)
    {
        if (MapSphere.notNullNotUndef(textures[i]))
        {
            //Write the image data into our canvas, stretching it so that it takes up the whole canvas.
            ctx.drawImage(textures[i], 0, 0, maxW, maxH);
        }
    }

    /*var img1 = $("#img1")[0];
    var img2 = $("#img2")[0];
    ctx.drawImage(img1, 0, 0, 1500, 1000);
    ctx.drawImage(img2, 0, 0, 1500, 1000);*/


    var finalTex = new THREE.Texture(canvas);
    finalTex.needsUpdate = true;

    return finalTex;
    
}

MapSphere.updateDebugOutput = function(labelname, message)
{
    //Check if the debug pane exists
    if(MapSphere.debugPane == null)
    {
        //If not, create it.
        MapSphere.createDebugPane();
    }

    //Does that label exist?
    if(MapSphere.debugPane.data("labels")[labelname] == undefined)
    {
        //No?  Create it.

        var container = $("<div id=\"#label_" + labelname + "\"></div>");

        var label = $("<span id=\"label_" + labelname + "_label\" style=\"padding: 5px;\">" + labelname + "</span>");
        var value = $("<span id=\"label_" + labelname + "_message\"></span>");

        container.append(label);
        container.append(value);

        MapSphere.debugPane.append(container);

        MapSphere.debugPane.data("labels")[labelname] = container;
    }


    MapSphere.debugPane.data("labels")[labelname].children("#label_" + labelname + "_message").text(message);

}

MapSphere.createDebugPane = function()
{
    if(MapSphere.debugPane == null)
    {
        var debugPane = $("<div class=\"mapSphereDebugPane\" title=\"MapSphere Debug Pane\"></div>");
        
        var b = $("document.body");

        b.append(debugPane);

        debugPane.dialog();

        debugPane.data("labels", new Array());

        MapSphere.debugPane = debugPane;
    }
}