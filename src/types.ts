import { Frozen } from "./frozen";

export type FreezerOpts = {
  live: boolean;
  freezeInstances: boolean;
  singleParent: boolean;
  mutable: boolean;
};
export type EventName = keyof typeof Frozen | "now";
export type EmitterEventName = string | "beforeAll" | "afterAll";

export type Store = {
  notify: (eventName: EventName, node, options, name) => void;
  freezeFn: (obj?) => void;
  live: boolean;
  freezeInstances: boolean;
  singleParent: boolean;
};

export type FreezerNode = {
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
    store: {
      freezeInstances: unknown;
      freezeFn: (freez: unknown) => unknown;
      live: unknown;
      singleParent: unknown;
    };
  };
};

export type NodeCreator = {
  init: (frozen: typeof Frozen) => void;
  clone?: (node: FreezerNode) => {};
};
