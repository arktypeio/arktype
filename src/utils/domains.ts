import type {
    classOf,
    Dictionary,
    evaluate,
    isTopType,
    List
} from "./generics.js"
import { isKeyOf } from "./generics.js"

export const hasDomain = <data, domain extends Domain>(
    data: data,
    domain: domain
): data is Extract<data, inferDomain<domain>> =>
    domainOf(data as any) === domain

type DomainTypes = {
    bigint: bigint
    boolean: boolean
    number: number
    object: object
    string: string
    symbol: symbol
    undefined: undefined
    null: null
}

export type inferDomain<domain extends Domain> = Domain extends domain
    ? unknown
    : DomainTypes[domain]

export type Domain = evaluate<keyof DomainTypes>

export type NullishDomain = "undefined" | "null"

export type NonNullishDomain = Exclude<Domain, NullishDomain>

export type PrimitiveDomain = Exclude<Domain, "object">

export type Primitive = inferDomain<PrimitiveDomain>

export type domainOf<data> = isTopType<data> extends true
    ? Domain
    : data extends object
    ? "object"
    : data extends string
    ? "string"
    : data extends number
    ? "number"
    : data extends boolean
    ? "boolean"
    : data extends undefined
    ? "undefined"
    : data extends null
    ? "null"
    : data extends bigint
    ? "bigint"
    : data extends symbol
    ? "symbol"
    : never

export const domainOf = <data>(data: data) => {
    const builtinType = typeof data
    return (
        builtinType === "object"
            ? data === null
                ? "null"
                : "object"
            : builtinType === "function"
            ? "object"
            : builtinType
    ) as domainOf<data>
}

// Built-in objects that can be returned from
// Object.prototype.toString.call(<value>). Based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export type ObjectKinds = {
    Array: readonly unknown[]
    Date: Date
    Error: Error
    Function: Function
    Map: Map<unknown, unknown>
    Object: Dictionary
    RegExp: RegExp
    Set: Set<unknown>
}

export type ObjectKind = keyof ObjectKinds

const objectKinds = {
    Array,
    Date,
    Error,
    Function,
    Map,
    Object: Object as unknown as classOf<Dictionary>,
    RegExp,
    Set
} satisfies {
    [k in ObjectKind]: classOf<ObjectKinds[k]>
}

export type kindOf<data extends object> = object extends data
    ? ObjectKind
    : data extends List
    ? "Array"
    : data extends Date
    ? "Date"
    : data extends Error
    ? "Error"
    : data extends Function
    ? "Function"
    : data extends Map<unknown, unknown>
    ? "Map"
    : data extends RegExp
    ? "RegExp"
    : data extends Set<unknown>
    ? "Set"
    : "Object"

export const kindOf = <data extends object>(data: data) => {
    if (Array.isArray(data)) {
        return "Array"
    }
    // The raw result will be something like [object Date]
    const prototypeName = Object.prototype.toString.call(data).slice(8, -1)
    if (isKeyOf(prototypeName, objectKinds)) {
        return data instanceof objectKinds[prototypeName]
            ? prototypeName
            : // If the prototype has the same name as one of the builtin types but isn't an instance of it, fall back to Object
              "Object"
    }
    if (prototypeName.endsWith("Error")) {
        return data instanceof Error ? "Error" : "Object"
    }
    return "Object"
}

export const hasKind = <kind extends ObjectKind>(
    data: unknown,
    domain: kind
): data is ObjectKinds[kind] =>
    hasDomain(data, "object") && kindOf(data) === domain
