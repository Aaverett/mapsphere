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

MapSphere.blendTextures = function(textures)
{
    //create a canvas.
    var canvas = document.createElement("canvas");
    canvas.width = 1500;
    canvas.height = 1000;
    //document.body.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    for(var i=0; i<textures.length; i++)
    {
        ctx.drawImage(textures[i], 0, 0, 1500, 1000);
    }

    /*var img1 = $("#img1")[0];
    var img2 = $("#img2")[0];
    ctx.drawImage(img1, 0, 0, 1500, 1000);
    ctx.drawImage(img2, 0, 0, 1500, 1000);*/


    var finalTex = new THREE.Texture(canvas);

    return finalTex;
    
}