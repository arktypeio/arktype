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
): data is Extract<data, Domains[domain]> => classify(data as any) === domain

export type Domains = {
    bigint: bigint
    boolean: boolean
    number: number
    object: object
    string: string
    symbol: symbol
    undefined: undefined
    null: null
}

export type Domain = evaluate<keyof Domains>

export type NullishDomain = "undefined" | "null"

export type NonNullishDomain = Exclude<Domain, NullishDomain>

export type PrimitiveDomain = Exclude<Domain, "object">

export type Primitive = Domains[PrimitiveDomain]

export type classify<data> = isTopType<data> extends true
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

export const classify = <data>(data: data) => {
    const builtinType = typeof data
    return (
        builtinType === "object"
            ? data === null
                ? "null"
                : "object"
            : builtinType === "function"
            ? "object"
            : builtinType
    ) as classify<data>
}

// Built-in objects that can be returned from
// Object.prototype.toString.call(<value>). Based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export type ObjectDomains = {
    Array: readonly unknown[]
    Date: Date
    Error: Error
    Function: Function
    Map: Map<unknown, unknown>
    Object: Dictionary
    RegExp: RegExp
    Set: Set<unknown>
}

export type ObjectDomain = keyof ObjectDomains

const objectDomains = {
    Array,
    Date,
    Error,
    Function,
    Map,
    Object: Object as unknown as classOf<Dictionary>,
    RegExp,
    Set
} satisfies {
    [k in ObjectDomain]: classOf<ObjectDomains[k]>
}

export type classifyObject<data extends object> = object extends data
    ? ObjectDomain
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

export const classifyObject = <data extends object>(data: data) => {
    if (Array.isArray(data)) {
        return "Array"
    }
    // The raw result will be something like [object Date]
    const prototypeName = Object.prototype.toString.call(data).slice(8, -1)
    if (isKeyOf(prototypeName, objectDomains)) {
        return data instanceof objectDomains[prototypeName]
            ? prototypeName
            : // If the prototype has the same name as one of the builtin types but isn't an instance of it, fall back to Object
              "Object"
    }
    if (prototypeName.endsWith("Error")) {
        return data instanceof Error ? "Error" : "Object"
    }
    return "Object"
}

export const hasObjectDomain = <domain extends ObjectDomain>(
    data: unknown,
    domain: domain
): data is ObjectDomains[domain] =>
    hasDomain(data, "object") && classifyObject(data) === domain

export const subclassify = (data: unknown) => {
    const domain = classify(data)
    return domain === "object" ? classifyObject(data as object) : domain
}
