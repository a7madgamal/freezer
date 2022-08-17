import { Utils } from "./utils";
import { Frozen } from "./frozen";
import {
  FreezerOpts,
  Store,
  FrozenNode,
  FreezerMethods,
  FreezerConstructor,
} from "./types";

var Freezer = function (
  this: FreezerMethods,
  initialValue,
  options: FreezerOpts
) {
  var me = this;
  var ops = options || ({} as FreezerOpts);
  var store: Partial<Store> = {
    live: ops.live || false,
    freezeInstances: ops.freezeInstances || false,
    singleParent: ops.singleParent || false,
  };
  // Immutable data
  var frozen: FrozenNode;
  var pivotTriggers = [];
  var pivotTicking = 0;

  var triggerNow = function (node: FrozenNode) {
    var _ = node.__;
    var i: number;

    if (_.listener) {
      var prevState = _.listener.prevState || node;
      _.listener.prevState = 0;
      Frozen.emit(prevState, "update", node, true);
    }

    for (i = 0; i < _.parents.length; i++) {
      _.store.notify("now", _.parents[i]);
    }
  };

  var addToPivotTriggers = function (node) {
    pivotTriggers.push(node);

    if (!pivotTicking) {
      pivotTicking = 1;
      Utils.nextTick(function () {
        pivotTriggers = [];
        pivotTicking = 0;
      });
    }
  };

  // Last call to display info about orphan calls
  var lastCall;
  store.notify = function notify(eventName, node, options, name) {
    if (name) {
      if (lastCall && !lastCall.onStore) {
        detachedWarn(lastCall);
      }
      lastCall = { name: name, node: node, options: options, onStore: false };
    }

    if (eventName === "now") {
      if (pivotTriggers.length) {
        while (pivotTriggers.length) {
          triggerNow(pivotTriggers.shift());
        }
      } else {
        triggerNow(node);
      }

      return node;
    }

    var update = Frozen[eventName](node, options);

    if (eventName !== "pivot") {
      var pivot = Utils.findPivot(update);
      if (pivot) {
        addToPivotTriggers(update);
        return pivot;
      }
    }

    return update;
  };

  store.freezeFn =
    ops.mutable === true
      ? function () {}
      : function (obj) {
          Object.freeze(obj);
        };

  // Create the frozen object
  frozen = Frozen.freeze(initialValue, store);
  frozen.__.updateRoot = function (prevNode: FrozenNode, updated: FrozenNode) {
    if (prevNode === frozen) {
      frozen = updated;
      if (lastCall) {
        lastCall.onStore = true;
      }
    } else if (lastCall) {
      setTimeout(function () {
        if (!lastCall.onStore) {
          detachedWarn(lastCall);
        }
      });
    }
  };

  // Listen to its changes immediately
  var listener = frozen.getListener();
  var hub = {};

  Utils.each(
    ["on", "off", "once", "emit", "trigger"],
    function (method: "on" | "off" | "once" | "emit" | "trigger") {
      var attrs = {};
      attrs[method] = listener[method].bind(listener);
      Utils.addNE(me, attrs);
      Utils.addNE(hub, attrs);
    }
  );

  Utils.addNE(this, {
    get: function () {
      return frozen;
    },
    set: function (node) {
      frozen.reset(node);
    },
    getEventHub: function () {
      return hub;
    },
  });

  Utils.addNE(this, { getData: this.get, setData: this.set });
};

function detachedWarn(lastCall) {
  Utils.warn(
    false,
    "Method " + lastCall.name + " called on a detached node.",
    lastCall.node,
    lastCall.options
  );
}

export default Freezer as unknown as FreezerConstructor;

export { FreezerOpts, Store, FrozenNode, FreezerMethods, FreezerConstructor };
