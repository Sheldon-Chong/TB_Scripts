// Minimal ES3-standard type declarations for TypeScript Harmony scripting

interface Object {}
interface Function {}
interface String {}
interface Number {}
interface Boolean {}
interface RegExp {}
interface IArguments {}
interface Array<T> {
  length: number;
  [index: number]: T;
  push(...items: T[]): number;
  pop(): T | undefined;
  // Add other methods as needed (e.g., shift, unshift, slice, etc.)
}
declare var Object: {
  prototype: Object;
};
declare var Function: {
  prototype: Function;
};
declare var String: {
  prototype: String;
};
declare var Number: {
  prototype: Number;
};
declare var Boolean: {
  prototype: Boolean;
};
declare var RegExp: {
  prototype: RegExp;
};

interface ArrayConstructor {
  isArray(arg: any): boolean;
}

declare const JSON: any;
declare const Error: any;

declare var Array: ArrayConstructor;
declare function include(path: string): void;