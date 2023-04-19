import type { evaluate } from "./generics.js"

export const hasKind = <data, domain extends Kind>(
    data: data,
    kind: domain
): data is data & inferKind<domain> => kindOf(data as any) === kind

type TypesByKind = {
    bigint: bigint
    boolean: boolean
    number: number
    object: object
    string: string
    symbol: symbol
    undefined: undefined
    null: null
}

export type inferKind<kind extends Kind> = Kind extends kind
    ? unknown
    : TypesByKind[kind]

export type Kind = evaluate<keyof TypesByKind>

export type NullishKind = "undefined" | "null"

export type NonNullishKind = Exclude<Kind, NullishKind>

export type PrimitiveKind = Exclude<Kind, "object">

export type Primitive = inferKind<PrimitiveKind>

export type kindOf<data> = unknown extends data
    ? Kind
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

export const kindOf = <data>(data: data) => {
    const builtinType = typeof data
    return (
        builtinType === "object"
            ? data === null
                ? "null"
                : "object"
            : builtinType === "function"
            ? "object"
            : builtinType
    ) as kindOf<data>
}

/** Each domain's completion for the phrase "Must be _____" */
export const kindDescriptions = {
    bigint: "a bigint",
    boolean: "boolean",
    null: "null",
    number: "a number",
    object: "an object",
    string: "a string",
    symbol: "a symbol",
    undefined: "undefined"
} as const satisfies Record<Kind, string>
