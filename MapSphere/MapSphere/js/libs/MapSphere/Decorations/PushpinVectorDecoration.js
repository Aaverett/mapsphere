
MapSphere.Decorations.PushpinVectorDecoration = MapSphere.Decorations.Decoration.extend({

    _upperZFunction: null,
    _lowerZFunction: null,
    _pushpins: null,
    _pushPinTiles: null,

    init: function (options)
    {
        this._super(options);

        if(MapSphere.notNullNotUndef(options.upperZFunction))
        {
            this._upperZFunction = options.upperZFunction;
        }

        if(MapSphere.notNullNotUndef(options.lowerZFunction))
        {
            this._lowerZFunction = options.lowerZFunction;
        }

        this._pushpins = new Array();
    },

    refreshContents: function()
    {
       
        var wrappers = this._layer.getFeatureWrappers();

        for(var i=0; i < wrappers.length; i++)
        {
            var pk = this._layer.getFeaturePK(wrappers[i].getFeature());

            //If the container doesn't exist, create it.
            if(!MapSphere.notNullNotUndef(this._pushpins[pk]))
            {
                this._pushpins[pk] = this.createPushpinContainer(wrappers[i]);
            }

            this.synchPushpin(this._pushpins[pk]);
        }
    },

    createPushpinContainer: function(wrapper)
    {
        var container =
            {
                wrapper: wrapper,
                pushpin: null,
                tile: null
            };

        return container;
    },

    synchPushpin: function(pushpin)
    {
        var tileIndices = this._layer.getFeatureLocIndices(pushpin.wrapper.getFeature());


    }

});