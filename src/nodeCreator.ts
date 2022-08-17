import {
  ArrayMethods,
  CommonMethods,
  FreezerNode,
  NodeCreator,
  ObjMethods,
} from "./types";
import { Utils } from "./utils";

var nodeCreator: NodeCreator = {
  init: function (this: NodeCreator, Frozen) {
    var commonMethods: CommonMethods = {
      set: function (attr, value) {
        var attrs = attr,
          update = this.__.trans,
          isArray = this.constructor === Array,
          msg = "Freezer arrays only accept numeric attributes, given: ";
        if (typeof attr !== "object") {
          if (isArray && parseInt(attr) != attr) {
            Utils.warn(0, msg + attr);
            return Utils.findPivot(this) || this;
          }
          attrs = {};
          attrs[attr] = value;
        }

        if (!update) {
          for (var key in attrs) {
            // @ts-expect-error whatever
            if (isArray && parseInt(key) != key) {
              Utils.warn(0, msg + key);
              return Utils.findPivot(this) || this;
            } else {
              update = update || this[key] !== attrs[key];
            }
          }

          // No changes, just return the node
          if (!update) return Utils.findPivot(this) || this;
        }

        var name = isArray ? "array.set" : "object.set";
        return this.__.store.notify("merge", this, attrs, name);
      },

      reset: function (attrs) {
        return this.__.store.notify("replace", this, attrs, "object.replace");
      },

      getListener: function () {
        return Frozen.createListener(this);
      },

      toJS: function () {
        var js;
        if (this.constructor === Array) {
          js = new Array(this.length);
        } else {
          js = {};
        }

        Utils.each(this, function (child, i) {
          if (child && child.__) js[i] = child.toJS();
          else js[i] = child;
        });

        return js;
      },

      transact: function () {
        return this.__.store.notify("transact", this);
      },

      run: function () {
        return this.__.store.notify("run", this);
      },

      now: function () {
        return this.__.store.notify("now", this);
      },

      pivot: function () {
        return this.__.store.notify("pivot", this);
      },
    };

    var extendedArrMethods: ArrayMethods = {
      push: function (el) {
        return this.append([el], "array.push");
      },

      append: function (els, name) {
        if (els && els.length)
          return this.__.store.notify(
            "splice",
            this,
            [this.length, 0].concat(els),
            name || "array.append"
          );
        return this;
      },

      pop: function () {
        if (!this.length) return this;

        return this.__.store.notify(
          "splice",
          this,
          [this.length - 1, 1],
          "array.pop"
        );
      },

      unshift: function (el) {
        return this.prepend([el], "array.unshift");
      },

      prepend: function (els) {
        if (els && els.length)
          return this.__.store.notify(
            "splice",
            this,
            [0, 0].concat(els),
            "array.prepend"
          );
        return this;
      },

      shift: function () {
        if (!this.length) return this;

        return this.__.store.notify("splice", this, [0, 1], "array.shift");
      },

      splice: function (index, toRemove, toAdd) {
        return this.__.store.notify("splice", this, arguments, "array.splice");
      },

      sort: function () {
        var mutable = this.slice();
        mutable.sort.apply(mutable, arguments);
        return this.__.store.notify("replace", this, mutable, "array.sort");
      },
    };
    var arrayMethods = Utils.extend(extendedArrMethods, commonMethods);

    var FrozenArray: CommonMethods & ArrayMethods = Object.create(
      Array.prototype,
      Utils.createNE(arrayMethods)
    );

    var extendedObjMethod: ObjMethods = {
      remove: function (keys) {
        var filtered = [],
          k = keys;
        if (keys.constructor !== Array) k = [keys];

        for (var i = 0, l = k.length; i < l; i++) {
          if (this.hasOwnProperty(k[i])) filtered.push(k[i]);
        }

        if (filtered.length)
          return this.__.store.notify(
            "remove",
            this,
            filtered,
            "object.remove"
          );
        return this;
      },
    };

    var objectMethods = Utils.createNE(
      Utils.extend(extendedObjMethod, commonMethods)
    );

    var FrozenObject: CommonMethods & ObjMethods = Object.create(
      Object.prototype,
      objectMethods
    );

    var createArray = (function () {
      // fast version
      if (([] as any).__proto__)
        return function (length: number) {
          var arr = new Array(length) as Array<any> &
            CommonMethods &
            ArrayMethods;
          (arr as any).__proto__ = FrozenArray;

          return arr;
        };

      // slow version for older browsers
      return function (length: number) {
        var arr = new Array(length) as Array<any> &
          CommonMethods &
          ArrayMethods;

        for (var m in arrayMethods) {
          arr[m] = arrayMethods[m];
        }

        return arr;
      };
    })();

    this.clone = function (node) {
      var cons = node.constructor;
      if (cons === Array) {
        return createArray(node.length) as unknown as FreezerNode;
      } else {
        if (cons === Object) {
          return Object.create(FrozenObject) as FreezerNode;
        }
        // Class instances
        else {
          return Object.create(cons.prototype, objectMethods) as FreezerNode;
        }
      }
    };
  },
};

export { nodeCreator };
