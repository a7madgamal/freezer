import { Frozen } from "./frozen";
export interface CommonMethods {
  set: (attr, value) => unknown;
  reset: (attrs) => unknown;
  getListener: () => unknown;
  toJS: () => unknown;
  transact: () => unknown;
  run: () => unknown;
  now: () => unknown;
  pivot: () => unknown;
}

export interface ArrayMethods {
  push: (el) => unknown;
  append: (el, name: string) => unknown;
  pop: () => unknown;
  unshift: (el) => unknown;
  prepend: (els) => unknown;
  shift: () => unknown;
  splice: (index, toRemove, toAdd) => unknown;
  sort: () => unknown;
}

export interface ObjMethods {
  remove: (keys) => unknown;
}

export type FreezerOpts = {
  live: boolean;
  freezeInstances: boolean;
  singleParent: boolean;
  mutable: boolean;
};
// function names on freez
export type FrozenEventName =
  | "freeze"
  | "merge"
  | "replace"
  | "remove"
  | "splice"
  | "transact"
  | "run"
  | "pivot"
  | "unpivot"
  | "refresh"
  | "fixChildren"
  | "copyMeta"
  | "refreshParents"
  | "removeParent"
  | "addParent"
  | "emit"
  | "createListener"
  | "now";
export type EmitterEventName = string | "beforeAll" | "afterAll";

export type Store = {
  notify: (
    eventName: FrozenEventName,
    node,
    options?,
    name?: "object.set" | "object.remove"
  ) => void;
  freezeFn: (obj?) => void;
  live: boolean;
  freezeInstances: boolean;
  singleParent: boolean;
};

interface FrozenMethods extends CommonMethods, ObjMethods, ArrayMethods {}

export interface FreezerNode extends FrozenMethods {
  __: {
    pivot: number;
    listener?: {
      ticking: unknown;
      emit: (eventName: unknown, scnd: unknown, node: FreezerNode) => void;
      prevState: FreezerNode | 0;
    };
    updateRoot: (oldChild: unknown, newChild: unknown) => unknown;
    parents: unknown[];
    trans: unknown[];
    store: Store;
  };
}

export type NodeCreator = {
  init: (frozen: typeof Frozen) => void;
  // todo: fix this to return based on node type
  clone?: (node) => FreezerNode;
};
