import { Frozen } from "./frozen";

export type EventMethods = {
  on: (event: string, cb: (store) => void) => void;
  off: () => void;
  once: () => void;
  emit: (eventName: "update", scnd: any, node: any) => void;
  trigger: () => void;
};

export type FreezerMethods = {
  get: () => FrozenNode;
  set: (node) => void;
  // todo: get it from initialValue type
  getData: () => any;
  setData: (data) => void;

  getEventHub: () => EventMethods;
} & EventMethods;

export type FreezerConstructor = {
  new (initialValue, options: FreezerOpts): FreezerMethods;
};

export interface CommonMethods {
  set: (attr, value) => unknown;
  reset: (attrs) => unknown;
  getListener: () => EventMethods;
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
    name?: "object.set" | "object.remove" | "object.replace" | "array.set"
  ) => void;
  freezeFn: (obj?) => void;
  live: boolean;
  freezeInstances: boolean;
  singleParent: boolean;
};

interface FrozenMethods extends CommonMethods, ObjMethods, ArrayMethods {}

export interface FrozenNode extends FrozenMethods {
  __: {
    pivot: number;
    listener?: {
      ticking?: unknown;
      prevState?: FrozenNode | 0;
    } & EventMethods;
    updateRoot: (oldChild: unknown, newChild: unknown) => unknown;
    parents: unknown[];
    trans?: any[];
    store: Store;
  };
}

export type NodeCreator = {
  init: (frozen: typeof Frozen) => void;
  // todo: fix this to return based on node type
  clone?: (node) => FrozenNode;
};
