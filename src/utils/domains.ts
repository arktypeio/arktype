import type {
    constructor,
    Dict,
    evaluate,
    isTopType,
    List
} from "./generics.ts"
import { isKeyOf } from "./generics.ts"

export const hasDomain = <data, domain extends Domain>(
    data: data,
    domain: domain
): data is data & inferDomain<domain> => domainOf(data as any) === domain

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
export type ObjectSubdomains = {
    Array: readonly unknown[]
    Date: Date
    Error: Error
    Function: Function
    Map: Map<unknown, unknown>
    RegExp: RegExp
    Set: Set<unknown>
    object: Dict
}

export type ObjectSubdomain = keyof ObjectSubdomains

export type Subdomain<domain extends Domain = Domain> =
    | domain
    | (domain extends "object" ? ObjectSubdomain : never)

const objectSubdomains = {
    Array,
    Date,
    Error,
    Function,
    Map,
    RegExp,
    Set,
    object: Object as unknown as constructor<Dict>
} satisfies {
    [subdomain in ObjectSubdomain]: constructor<ObjectSubdomains[subdomain]>
}

export type subdomainOf<data> = isTopType<data> extends true
    ? Subdomain
    : data extends object
    ? object extends data
        ? ObjectSubdomain
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
        : "object"
    : domainOf<data>

export const subdomainOf = ((data): Subdomain => {
    const domain = domainOf(data)
    if (domain !== "object") {
        return domain
    }
    if (Array.isArray(data)) {
        return "Array"
    }
    // The raw result will be something like [object Date]
    const prototypeName = Object.prototype.toString.call(data).slice(8, -1)
    if (isKeyOf(prototypeName, objectSubdomains)) {
        return data instanceof objectSubdomains[prototypeName]
            ? prototypeName
            : // If the prototype has the same name as one of the builtin types but isn't an instance of it, fall back to Record
              "object"
    }
    if (prototypeName.endsWith("Error")) {
        return data instanceof Error ? "Error" : "object"
    }
    return "object"
}) as <data>(data: data) => subdomainOf<data>

export type inferSubdomain<subdomain extends Subdomain> =
    subdomain extends ObjectSubdomain
        ? ObjectSubdomains[subdomain]
        : subdomain extends Domain
        ? DomainTypes[subdomain]
        : never

export const hasSubdomain = <subdomain extends Subdomain>(
    data: unknown,
    subdomain: subdomain
): data is inferSubdomain<subdomain> => subdomainOf(data) === subdomain

export const sizeOf = <data>(data: data) =>
    sizedSubdomains[subdomainOf(data)]?.(data) ?? 0

const sizedSubdomains = {
    number: (data) => data,
    string: (data) => data.length,
    Array: (data) => data.length
} satisfies {
    [subdomain in SizedSubdomain]: (data: inferSubdomain<subdomain>) => number
} as {
    [subdomain in Subdomain]?: (data: unknown) => number
}

export const unitsOf = <data>(data: data) => sizeUnits[subdomainOf(data)] ?? ""

const sizeUnits = {
    number: "",
    string: "characters",
    Array: "items"
} satisfies Record<SizedSubdomain, string> as {
    [subdomain in Subdomain]?: string
}

export type SizedSubdomain = "number" | "string" | "Array"

export type SizedData = inferSubdomain<SizedSubdomain>

export const classNameOf = <data>(data: data) => Object(data).constructor.name
