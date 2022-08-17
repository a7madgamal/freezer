import { Utils } from "./utils";
import { nodeCreator } from "./nodeCreator";
import { Emitter } from "./emitter";
import { FreezerNode, Store } from "./types";

var Frozen = {
  freeze: function (node: FreezerNode, store: Partial<Store>): FreezerNode {
    if (node && node.__) {
      return node as unknown as FreezerNode;
    }

    var me = this;
    var frozen = nodeCreator.clone(node);

    Utils.addNE(frozen, {
      __: {
        listener: false,
        parents: [],
        store: store,
      },
    });

    // Freeze children
    Utils.each(node, function (child, key) {
      if (!Utils.isLeaf(child, store.freezeInstances)) {
        child = me.freeze(child, store);
      }

      if (child && child.__) {
        me.addParent(child, frozen);
      }

      frozen[key] = child;
    });

    store.freezeFn(frozen);

    return frozen;
  },

  merge: function (node: FreezerNode, attrs: object) {
    var _ = node.__,
      trans = _.trans,
      // Clone the attrs to not modify the argument
      attrs = Utils.extend({}, attrs);
    if (trans) {
      for (var attr in attrs) trans[attr] = attrs[attr];
      return node;
    }

    var me = this;
    var frozen = this.copyMeta(node);
    var store = _.store;
    var val;
    var key;
    var isFrozen;

    Utils.each(node, function (child, key) {
      isFrozen = child && child.__;

      if (isFrozen) {
        me.removeParent(child, node);
      }

      val = attrs[key];
      if (!val) {
        if (isFrozen) me.addParent(child, frozen);
        return (frozen[key] = child);
      }

      if (!Utils.isLeaf(val, store.freezeInstances))
        val = me.freeze(val, store);

      if (val && val.__) me.addParent(val, frozen);

      delete attrs[key];

      frozen[key] = val;
    });

    for (key in attrs) {
      val = attrs[key];

      if (!Utils.isLeaf(val, store.freezeInstances))
        val = me.freeze(val, store);

      if (val && val.__) me.addParent(val, frozen);

      frozen[key] = val;
    }

    _.store.freezeFn(frozen);

    this.refreshParents(node, frozen);

    return frozen;
  },

  replace: function (node: FreezerNode, replacement: FreezerNode) {
    var me = this;
    var _ = node.__;
    var frozen = replacement;

    if (!Utils.isLeaf(replacement, _.store.freezeInstances)) {
      frozen = me.freeze(replacement, _.store);
      frozen.__.parents = _.parents;
      frozen.__.updateRoot = _.updateRoot;

      // Add the current listener if exists, replacing a
      // previous listener in the frozen if existed
      if (_.listener) frozen.__.listener = _.listener;
    }
    if (frozen) {
      this.fixChildren(frozen, node);
    }
    this.refreshParents(node, frozen);

    return frozen;
  },

  remove: function (node: FreezerNode, attrs: (string | number)[]) {
    var trans = node.__.trans;
    if (trans) {
      for (var l = attrs.length - 1; l >= 0; l--) delete trans[attrs[l]];
      return node;
    }

    var me = this;
    var frozen = this.copyMeta(node);
    var isFrozen;

    Utils.each(node, function (child, key) {
      isFrozen = child && child.__;

      if (isFrozen) {
        me.removeParent(child, node);
      }

      if (attrs.indexOf(key) !== -1) {
        return;
      }

      if (isFrozen) me.addParent(child, frozen);

      frozen[key] = child;
    });

    node.__.store.freezeFn(frozen);
    this.refreshParents(node, frozen);

    return frozen;
  },

  splice: function (node: FreezerNode, args) {
    var _ = node.__,
      trans = _.trans;
    if (trans) {
      trans.splice.apply(trans, args);
      return node;
    }

    var me = this,
      frozen = this.copyMeta(node),
      index = args[0],
      deleteIndex = index + args[1],
      child;

    // Clone the array
    Utils.each(node, function (child, i) {
      if (child && child.__) {
        me.removeParent(child, node);

        // Skip the nodes to delete
        if (i < index || i >= deleteIndex) me.addParent(child, frozen);
      }

      frozen[i] = child;
    });

    // Prepare the new nodes
    if (args.length > 1) {
      for (var i = args.length - 1; i >= 2; i--) {
        child = args[i];

        if (!Utils.isLeaf(child, _.store.freezeInstances))
          child = this.freeze(child, _.store);

        if (child && child.__) this.addParent(child, frozen);

        args[i] = child;
      }
    }

    // splice
    Array.prototype.splice.apply(frozen, args);

    _.store.freezeFn(frozen);
    this.refreshParents(node, frozen);

    return frozen;
  },

  transact: function (node: FreezerNode) {
    var me = this,
      transacting = node.__.trans,
      trans;

    if (transacting) return transacting;

    trans = node.constructor === Array ? [] : {};

    Utils.each(node, function (child, key) {
      trans[key] = child;
    });

    node.__.trans = trans;

    // Call run automatically in case
    // the user forgot about it
    Utils.nextTick(function () {
      if (node.__.trans) me.run(node);
    });

    return trans;
  },

  run: function (node: FreezerNode) {
    var me = this,
      trans = node.__.trans;
    if (!trans) return node;

    // Remove the node as a parent
    Utils.each(trans, function (child, key) {
      if (child && child.__) {
        me.removeParent(child, node);
      }
    });

    delete node.__.trans;

    var result = this.replace(node, trans);
    return result;
  },

  pivot: function (node: FreezerNode) {
    node.__.pivot = 1;
    this.unpivot(node);
    return node;
  },

  unpivot: function (node: FreezerNode) {
    Utils.nextTick(function () {
      node.__.pivot = 0;
    });
  },

  refresh: function (node: FreezerNode, oldChild, newChild?) {
    var me = this;
    var trans = node.__.trans;
    var found = 0;

    if (trans) {
      Utils.each(trans, function (child, key) {
        if (found) return;

        if (child === oldChild) {
          trans[key] = newChild;
          found = 1;

          if (newChild && newChild.__) me.addParent(newChild, node);
        }
      });

      return node;
    }

    var frozen = this.copyMeta(node);
    var __;

    Utils.each(node, function (child, key) {
      if (child === oldChild) {
        child = newChild;
      }

      // todo: is this a bug? should be === ?
      if (child && (__ = child.__)) {
        me.removeParent(child, node);
        me.addParent(child, frozen);
      }

      frozen[key] = child;
    });

    node.__.store.freezeFn(frozen);

    this.refreshParents(node, frozen);
  },

  fixChildren: function (node: FreezerNode, oldNode: FreezerNode) {
    var me = this;
    Utils.each(node, function (child) {
      if (!child || !child.__) return;

      // Update parents in all children no matter the child
      // is linked to the node or not.
      me.fixChildren(child);

      if (child.__.parents.length === 1) return (child.__.parents = [node]);

      if (oldNode) me.removeParent(child, oldNode);

      me.addParent(child, node);
    });
  },

  copyMeta: function (node: FreezerNode) {
    var me = this,
      frozen = nodeCreator.clone(node),
      _ = node.__;
    Utils.addNE(frozen, {
      __: {
        store: _.store,
        updateRoot: _.updateRoot,
        listener: _.listener,
        parents: _.parents.slice(0),
        trans: _.trans,
        pivot: _.pivot,
      },
    });

    if (_.pivot) this.unpivot(frozen);

    return frozen;
  },

  refreshParents: function (oldChild: FreezerNode, newChild: FreezerNode) {
    var _ = oldChild.__,
      parents = _.parents.length,
      i;

    if (oldChild.__.updateRoot) {
      oldChild.__.updateRoot(oldChild, newChild);
    }
    if (newChild) {
      this.emit(oldChild, "update", newChild, _.store.live);
    }
    if (parents) {
      for (i = parents - 1; i >= 0; i--) {
        this.refresh(_.parents[i], oldChild, newChild);
      }
    }
  },

  removeParent: function (node: FreezerNode, parent) {
    var parents = node.__.parents,
      index = parents.indexOf(parent);
    if (index !== -1) {
      parents.splice(index, 1);
    }
  },

  addParent: function (node: FreezerNode, parent) {
    var parents = node.__.parents,
      index = parents.indexOf(parent);
    if (index === -1) {
      if (node.__.store.singleParent && parents.length >= 1) {
        throw new Error(
          "Freezer: Can't add node to the tree. It's already added and freezer is configured to `singleParent: true`."
        );
      }
      parents[parents.length] = parent;
    }
  },

  emit: function (
    node: FreezerNode,
    eventName: "update",
    param?,
    now?: boolean
  ) {
    var listener = node.__.listener;
    if (!listener) return;

    var ticking = listener.ticking;

    if (now) {
      if (ticking || param) {
        listener.ticking = 0;
        listener.emit(eventName, ticking || param, node);
      }
      return;
    }

    listener.ticking = param;
    if (!listener.prevState) {
      listener.prevState = node;
    }

    if (!ticking) {
      Utils.nextTick(function () {
        if (listener.ticking) {
          var updated = listener.ticking,
            prevState = listener.prevState;
          listener.ticking = 0;
          listener.prevState = 0;

          listener.emit(eventName, updated, node);
        }
      });
    }
  },

  createListener: function (frozen) {
    var l = frozen.__.listener;

    if (!l) {
      l = Object.create(Emitter, {
        _events: {
          value: {},
          writable: true,
        },
      });

      frozen.__.listener = l;
    }

    return l;
  },
} as const;

nodeCreator.init(Frozen);

export { Frozen };
