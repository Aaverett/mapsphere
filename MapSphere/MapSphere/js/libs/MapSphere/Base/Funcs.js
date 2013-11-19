//Funcs.js
//Aaron Averett
//This contains semi-global functions that will be needed througout MapSphere, but we don't want to collide with other libs.


MapSphere.notNullNotUndef = function (obj)
{
    if (obj == undefined) return false;

    if (obj == null) return false;

    return true;
}