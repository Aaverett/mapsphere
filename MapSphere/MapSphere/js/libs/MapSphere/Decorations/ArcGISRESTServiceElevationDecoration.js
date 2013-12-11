//This is a height map decoration for the basic ellipsoid that loads its data from an ArcGIS REST API service.

MapSphere.Decorations.ArcGISRESTServiceElevationDecoration = MapSphere.Decorations.ArcGISRESTServiceDecoration.extend({
    init: function(options)
    {
        this._super(options);

        this._providesElevation = true;
        this._providesTexture = false;
    },

    handleRefreshMapServiceMetadataResponse: function (args) {

        this._super(args);
        
        if(this._visible)
        {
            this.handlePendingElevationRequests();
        }
    },

    //This is unique to every implementation because texture requests are not necessarily asynchronous.  
    handlePendingElevationRequests: function () {
        
        if (this.checkCanRequestMap()) {
            //Sweet, we're able to handle requests.  Let's get to it...

            //Loop over the requests
            for (var i = 0; i < this._elevationRequests.length; i++) {
                var req = this._elevationRequests[i];

                if (!req.pending) {
                    //Ok, it's not pending yet...  We need to process it.
                    this.handleElevationRequest(req);
                }
            }
        }
    },

    handleElevationRequest: function (req) {
        //Set the request as pending.
        req.pending = true;

        //Do some configuration on the request.

        //Delegate function for handling the response from the map service.  
        //This gets bound to our request anonymous object
        var  handleMapImageResponseHelper = function(args) {
            this.data.owner.handleElevationMapImageResponse(this, args);
        }

        var reqData = {
            owner: this
        };

        req.data = reqData;

        var visibleExtent = req.extent;
        var bbox = visibleExtent.getSW().lng() + "," + visibleExtent.getSW().lat() + "," + visibleExtent.getNE().lng() + "," + visibleExtent.getNE().lat();
        var extentWidth = visibleExtent.getNE().lng() - visibleExtent.getSW().lng();
        var extentHeight = visibleExtent.getNE().lat() - visibleExtent.getSW().lat();
        var extentAR = extentWidth / extentHeight;
        var imgWidth, imgHeight;

        if (extentAR >= 1) {
            imgWidth = 32;
            imgHeight = imgWidth / extentAR;
        }
        else {
            imgHeight = 32;
            imgWidth = imgHeight / extentAR;
        }

        var imgDimensions = imgWidth + "," + imgHeight;

        //Compose a request for a map of the visible area.
        var fullUrl = this._mapServiceURL + "/export";

        var data = {
            f: "json",
            bbox: bbox,
            size: imgDimensions,
            imageSR: "4326",
            format: "png"
        };

        var ajaxOpts = {
            data: data,
            complete: handleMapImageResponseHelper.bind(req)
        };

        $.ajax(fullUrl, ajaxOpts);
    },

    handleElevationMapImageResponse: function (senderReq, args) {
        //Delegate function to handle completion of loading of the texture image.
        var handleMapImageLoadCompleteHelper = function (args) {
            this.data.owner.handleElevationMapImageLoadComplete(this, args);
        }

        var responseData = JSON.parse(args.responseText);

        var req = senderReq;

        var imageUrl = responseData.href;

        //Now that we have a URL for the texture, we need to fetch it.
        var img = document.createElement("img");
        req.texture = img;
        img.crossOrigin = "anonymous";
        img.onload = handleMapImageLoadCompleteHelper.bind(senderReq);
        img.src = imageUrl; //This will light off the requesting of the image.


    },

    handleElevationMapImageLoadComplete: function (sender, args) {
        var img = args.target;

        var callbackArgs =
            {
                sender: this,
                image: img,
                whiteVal: 10000,
                blackVal: 0
            };

        sender.callback(callbackArgs);
    }
});