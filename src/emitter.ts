import { EmitterEventName } from "./types";
import { Utils } from "./utils";

const BEFOREALL = "beforeAll";
const AFTERALL = "afterAll";
const specialEvents = [BEFOREALL, AFTERALL] as const;

// The prototype methods are stored in a different object
// and applied as non enumerable properties later
var emitterProto = {
  on: function (eventName: EmitterEventName, listener, once?: boolean) {
    var listeners = this._events[eventName] || [];

    listeners.push({ callback: listener, once: once });
    this._events[eventName] = listeners;

    return this;
  },

  once: function (eventName: EmitterEventName, listener) {
    return this.on(eventName, listener, true);
  },

  off: function (eventName: EmitterEventName, listener?) {
    if (typeof eventName === "undefined") {
      this._events = {};
    } else if (typeof listener === "undefined") {
      this._events[eventName] = [];
    } else {
      var listeners = this._events[eventName] || [];
      var i;

      for (i = listeners.length - 1; i >= 0; i--) {
        if (listeners[i].callback === listener) listeners.splice(i, 1);
      }
    }

    return this;
  },

  emit: function (eventName: EmitterEventName) {
    var args = [].slice.call(arguments, 1);
    var listeners = this._events[eventName] || [];
    var onceListeners = [];
    var special = specialEvents.indexOf(eventName as any) !== -1;
    var i;
    var listener;
    var returnValue;
    var lastValue;

    special || this.emit.apply(this, [BEFOREALL, eventName].concat(args));

    // Call listeners
    for (i = 0; i < listeners.length; i++) {
      listener = listeners[i];

      if (listener.callback) lastValue = listener.callback.apply(this, args);
      else {
        // If there is not a callback, remove!
        listener.once = true;
      }

      if (listener.once) onceListeners.push(i);

      if (lastValue !== undefined) {
        returnValue = lastValue;
      }
    }

    // Remove listeners marked as once
    for (i = onceListeners.length - 1; i >= 0; i--) {
      listeners.splice(onceListeners[i], 1);
    }

    special || this.emit.apply(this, [AFTERALL, eventName].concat(args));

    return returnValue;
  },

  trigger: function () {
    Utils.warn(
      false,
      "Method `trigger` is deprecated and will be removed from freezer in upcoming releases. Please use `emit`."
    );
    return this.emit.apply(this, arguments);
  },
} as const;

// Methods are not enumerable so, when the stores are
// extended with the emitter, they can be iterated as
// hashmaps
// todo: is this accurate?
var Emitter = Utils.createNonEnumerable(emitterProto) as typeof emitterProto;

export { Emitter };
