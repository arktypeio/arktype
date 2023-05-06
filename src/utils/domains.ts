import type { evaluate } from "./generics.js"

export const hasDomain = <data, domain extends Domain>(
    data: data,
    kind: domain
): data is data & inferDomain<domain> => domainOf(data as any) === kind

type TypesByDomain = {
    bigint: bigint
    boolean: boolean
    number: number
    object: object
    string: string
    symbol: symbol
    undefined: undefined
    null: null
}

type TypesByRangeDomain = {
    string: string
    object: object
    number: number
}

export type inferDomain<kind extends Domain> = Domain extends kind
    ? unknown
    : TypesByDomain[kind]

export type Domain = evaluate<keyof TypesByDomain>

export type RangeDomains = evaluate<keyof TypesByRangeDomain>

export type NullishDomain = "undefined" | "null"

export type NonNullishDomain = Exclude<Domain, NullishDomain>

export type PrimitiveDomain = Exclude<Domain, "object">

export type Primitive = inferDomain<PrimitiveDomain>

export type domainOf<data> = unknown extends data
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

/** Each domain's completion for the phrase "Must be _____" */
export const domainDescriptions = {
    bigint: "a bigint",
    boolean: "boolean",
    null: "null",
    number: "a number",
    object: "an object",
    string: "a string",
    symbol: "a symbol",
    undefined: "undefined"
} as const satisfies Record<Domain, string>
