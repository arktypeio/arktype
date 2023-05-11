import type { Domain } from "./domains.js"
import { domainOf } from "./domains.js"
import type { evaluate } from "./generics.js"
import type { Key } from "./records.js"
import { isKeyOf } from "./records.js"

// Built-in object constructors based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export const defaultObjectKinds = {
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
} as const satisfies ObjectKindSet

export type InferredObjectKinds = {
    [kind in DefaultObjectKind]: inferObjectKind<kind>
}

export type inferObjectKind<
    kind extends keyof kinds,
    kinds extends ObjectKindSet = DefaultObjectKindSet
> = kind extends "Function"
    ? (...args: any[]) => unknown
    : kind extends "Object"
    ? Record<string, unknown>
    : instanceOf<kinds[kind]>

export type BuiltinClassName = Exclude<
    DefaultObjectKind,
    "Object" | "Function" | "Array"
>

type BuiltinClassesByName = {
    [kind in BuiltinClassName]: instanceOf<DefaultObjectKindSet[kind]>
}

export type BuiltinClass = BuiltinClassesByName[BuiltinClassName]

export type ObjectKindSet = Record<string, constructor>

export type DefaultObjectKindSet = typeof defaultObjectKinds

export type DefaultObjectKind = keyof DefaultObjectKindSet

export type objectKindOf<
    data,
    kinds extends ObjectKindSet = DefaultObjectKindSet
> = unknown extends data
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

export const hasObjectKind = <
    kind extends keyof kinds,
    kinds extends ObjectKindSet = DefaultObjectKindSet
>(
    data: unknown,
    kind: kind,
    kinds?: kinds
): data is inferObjectKind<kind, kinds> => objectKindOf(data, kinds) === kind

export const isArray = (data: unknown): data is readonly unknown[] =>
    Array.isArray(data)

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

// this will only return an object kind if it's the root constructor
// example TypeError would return undefined not 'Error'
export const getExactConstructorObjectKind = (
    constructor: unknown
): DefaultObjectKind | undefined => {
    const constructorName: string | undefined = Object(constructor).name
    return constructorName &&
        isKeyOf(constructorName, defaultObjectKinds) &&
        defaultObjectKinds[constructorName] === constructor
        ? constructorName
        : undefined
}

export type constructor<instance = unknown> = new (...args: any[]) => instance

export type instanceOf<classType extends constructor<any>> =
    classType extends constructor<infer Instance> ? Instance : never

/** Mimics output of TS's keyof operator at runtime */
export const prototypeKeysOf = <t>(value: t): evaluate<keyof t>[] => {
    const result: (string | number | symbol)[] = []
    while (
        value !== Object.prototype &&
        value !== null &&
        value !== undefined
    ) {
        for (const k of Object.getOwnPropertyNames(value)) {
            if (k !== "constructor" && !result.includes(k)) {
                result.push(k)
            }
        }
        for (const symbol of Object.getOwnPropertySymbols(value)) {
            if (!result.includes(symbol)) {
                result.push(symbol)
            }
        }
        value = Object.getPrototypeOf(value)
    }
    return result as evaluate<keyof t>[]
}

export const baseKeysByDomain: Record<Domain, readonly Key[]> = {
    bigint: prototypeKeysOf(0n),
    boolean: prototypeKeysOf(false),
    null: [],
    number: prototypeKeysOf(0),
    // TS doesn't include the Object prototype in keyof, so keyof object is never
    object: [],
    string: prototypeKeysOf(""),
    symbol: prototypeKeysOf(Symbol()),
    undefined: []
}

export const constructorExtends = (
    constructor: constructor,
    base: constructor
) => {
    let current = constructor.prototype

    while (current !== null) {
        if (current === base.prototype) {
            return true
        }

        current = Object.getPrototypeOf(current)
    }
    return false
}
