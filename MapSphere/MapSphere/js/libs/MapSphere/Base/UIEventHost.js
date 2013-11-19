MapSphere.UIEventHost = MapSphere.Class.extend({
    //Adds an event listener to the queue of event handlers to be called for the given event name
    addEventListener: function (eventName, handler, target) {
        if (this.eventListeners == undefined) this.eventListeners = new Array();

        var el = {
            eventName: eventName,
            handler: handler,
            target: target
        };

        this.eventListeners.push(el);
    },

    //Removes an event handler from the queue of event handlers to be called for the given event name
    removeEventListener: function (eventName, handler, target) {
        if (this.eventListeners == undefined) this.eventListeners = new Array();

        for (var i = 0; i < this.eventListeners.length; i++) {
            if (this.eventListeners[i].eventName == eventName && (this.eventListeners[i].handler == handler || this.eventListeners[i].target == target)) {
                this.eventListeners.splice(i, 1);
            }
        }
    },

    //"Raises" the specified event, calling each event handler.
    raiseEvent: function (eventName, args) {
        if (this.eventListeners == undefined) this.eventListeners = new Array();

        for (var i = 0; i < this.eventListeners.length; i++) {
            if (this.eventListeners[i].eventName == eventName) {
                if (this.eventListeners[i].target == null) {
                    //if no target was supplied, just call the handler.
                    this.eventListeners[i].handler(args);
                }
                else {
                    //If a target was supplied, call the function on the target.
                    var handler = this.eventListeners[i].handler.bind(this.eventListeners[i].target);

                    handler(args);
                }
            }
        }
    },

    containsEvent: function (eventName, handler, target) {
        return beans.beans;
    }
});