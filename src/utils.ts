import { FreezerNode } from "./types";

var global =
  typeof global !== "undefined"
    ? global
    : typeof self !== "undefined"
    ? self
    : typeof window !== "undefined"
    ? window
    : {};

var Utils = {
  extend: function (ob: object, props: object) {
    for (var p in props) {
      ob[p] = props[p];
    }
    return ob;
  },

  createNonEnumerable: function (obj: object, proto?: object) {
    var ne = {};
    for (var key in obj) ne[key] = { value: obj[key] };

    return Object.create(proto || {}, ne);
  },

  error: function (message: string) {
    var err = new Error(message);
    if (console) return console.error(err);
    else throw err;
  },

  each: function (o, clbk: (child, i: string | number) => void) {
    var i: number;
    var l: number;
    var keys: string[];

    if (o && o.constructor === Array) {
      for (i = 0, l = o.length; i < l; i++) clbk(o[i], i);
    } else {
      keys = Object.keys(o);
      for (i = 0, l = keys.length; i < l; i++) clbk(o[keys[i]], keys[i]);
    }
  },

  addNE: function (node, attrs) {
    for (var key in attrs) {
      Object.defineProperty(node, key, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: attrs[key],
      });
    }
  },

  /**
   * Creates non-enumerable property descriptors, to be used by Object.create.
   * @param  {Object} attrs Properties to create descriptors
   * @return {Object}       A hash with the descriptors.
   */
  createNE: function (attrs: object): PropertyDescriptorMap {
    var ne = {};
    for (var key in attrs) {
      ne[key] = {
        writable: true,
        configurable: true,
        enumerable: false,
        value: attrs[key],
      };
    }

    return ne;
  },

  // nextTick - by stagas / public domain
  nextTick: (function () {
    var queue: Array<() => void> = [];
    var dirty = false;
    var fn: () => void;
    var hasPostMessage: boolean =
      !!global.postMessage &&
      typeof Window !== "undefined" &&
      global instanceof Window;
    var messageName = "fzr" + Date.now();
    var trigger = (function () {
      return hasPostMessage
        ? function trigger() {
            global.postMessage(messageName, "*");
          }
        : function trigger() {
            setTimeout(function () {
              processQueue();
            }, 0);
          };
    })();

    var processQueue = (function () {
      return hasPostMessage
        ? function processQueue(event?) {
            if (event.data === messageName) {
              event.stopPropagation();
              flushQueue();
            }
          }
        : flushQueue;
    })();

    function flushQueue() {
      dirty = false;
      while ((fn = queue.shift())) {
        fn();
      }
    }

    function nextTick(fn: () => void) {
      queue.push(fn);

      if (dirty) return;

      dirty = true;
      trigger();
    }

    if (hasPostMessage) global.addEventListener("message", processQueue, true);

    nextTick.removeListener = function () {
      global.removeEventListener("message", processQueue, true);
    };

    return nextTick;
  })(),

  findPivot: function (node: FreezerNode) {
    if (!node || !node.__) return;

    if (node.__.pivot) return node;

    var found = 0;
    var parents = node.__.parents;
    var i = 0;
    var parent;

    // Look up for the pivot in the parents
    while (!found && i < parents.length) {
      parent = parents[i];
      if (parent.__.pivot) found = parent;
      i++;
    }

    if (found) {
      return found;
    }

    // If not found, try with the parent's parents
    i = 0;
    while (!found && i < parents.length) {
      found = this.findPivot(parents[i]);
      i++;
    }

    return found;
  },

  isLeaf: function (node: FreezerNode, freezeInstances) {
    var cons;
    return (
      !node ||
      !(cons = node.constructor) ||
      (freezeInstances
        ? cons === String || cons === Number || cons === Boolean
        : cons !== Object && cons !== Array)
    );
  },

  warn: function (...arg: any[]) {
    var args;
    if (
      typeof process === "undefined" ||
      process.env.NODE_ENV !== "production"
    ) {
      if (!arguments[0] && typeof console !== "undefined") {
        args = Array.prototype.slice.call(arguments, 1);
        args[0] = "Freezer.js WARNING: " + args[0];
        console.warn.apply(console, args);
      }
    }
  },
};

export { Utils };
