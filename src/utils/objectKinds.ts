import { domainOf } from "./domains.ts"
import type { constructor, isTopType } from "./generics.ts"

// Built-in object constructors based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const defaultObjectKinds = {
    Array,
    Date,
    Error,
    Function,
    Map,
    RegExp,
    Set,
    Object,
    String,
    Number,
    Boolean,
    WeakMap,
    WeakSet,
    Promise
} satisfies ObjectKindSet

export type ObjectKindSet = Record<string, constructor>

export type DefaultObjectKindSet = typeof defaultObjectKinds

export type DefaultObjectKind = keyof DefaultObjectKindSet

export type objectKindOf<
    data,
    kinds extends ObjectKindSet = DefaultObjectKindSet
> = isTopType<data> extends true
    ? undefined | keyof kinds
    : data extends object
    ? object extends data
        ? keyof kinds
        : {
              [kind in keyof kinds]: kinds[kind] extends constructor<data>
                  ? kind
                  : data extends (...args: any[]) => unknown
                  ? "Function"
                  : "Object"
          }[keyof kinds]
    : undefined

export const objectKindOf = <
    data,
    kinds extends ObjectKindSet = DefaultObjectKindSet
>(
    data: data,
    kinds?: kinds
) => {
    if (domainOf(data) !== "object") {
        return undefined
    }
    const kindSet: ObjectKindSet = kinds ?? defaultObjectKinds
    let prototype: Partial<Object> = Object.getPrototypeOf(data)
    while (
        prototype?.constructor &&
        (!kindSet[prototype.constructor.name] ||
            !(data instanceof kindSet[prototype.constructor.name]))
    ) {
        prototype = Object.getPrototypeOf(prototype)
    }
    return prototype?.constructor?.name as objectKindOf<data, kinds>
}

export type inferObjectKind<
    kind extends keyof kinds,
    kinds extends ObjectKindSet = DefaultObjectKindSet
> = kinds[kind]

export const hasObjectKind = <
    kind extends keyof kinds,
    kinds extends ObjectKindSet = DefaultObjectKindSet
>(
    data: unknown,
    kind: kind,
    kinds?: kinds
): data is inferObjectKind<kind, kinds> => objectKindOf(data, kinds) === kind

export const isArray = <data>(
    data: data
): data is Extract<data, readonly unknown[]> => Array.isArray(data)

/** Each defaultObjectKind's completion for the phrase "Must be _____" */
export const objectKindDescriptions = {
    Object: "an object",
    Array: "an array",
    Function: "a function",
    Date: "a Date",
    RegExp: "a RegExp",
    Error: "an Error",
    Map: "a Map",
    Set: "a Set",
    String: "a String object",
    Number: "a Number object",
    Boolean: "a Boolean object",
    Promise: "a Promise",
    WeakMap: "a WeakMap",
    WeakSet: "a WeakSet"
} as const satisfies Record<DefaultObjectKind, string>
