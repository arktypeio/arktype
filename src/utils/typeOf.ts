import type { evaluate, isTopType } from "./generics.js"

export type Types = {
    bigint: bigint
    boolean: boolean
    number: number
    object: dict
    string: string
    symbol: symbol
    undefined: undefined
    null: null
}

export type TypeName = evaluate<keyof Types>

export type typeOf<data> = isTopType<data> extends true
    ? TypeName
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

export const typeOf = <data>(data: data) => {
    const builtinType = typeof data
    return (
        builtinType === "object"
            ? data === null
                ? "null"
                : "object"
            : builtinType === "function"
            ? "object"
            : builtinType
    ) as typeOf<data>
}

export const hasType = <name extends TypeName>(
    data: unknown,
    name: name
): data is Types[name] => typeOf(data) === name

export const typeIn = <name extends TypeName>(
    data: unknown,
    names: Record<name, unknown>
): data is Types[name] => typeOf(data) in names

export type ObjectSubtypes = {
    none: dict
    array: array
    function: Function
}

export type array<of = unknown> = readonly of[]

export type dict<of = unknown> = { readonly [k in string]: of }

export type ObjectSubtypeName = evaluate<keyof ObjectSubtypes>

export type objectSubtypeOf<data extends object> = dict extends data
    ? ObjectSubtypeName
    : data extends array
    ? "array"
    : data extends Function
    ? "function"
    : "none"

export const objectSubtypeOf = <data extends object>(data: data) =>
    (Array.isArray(data)
        ? "array"
        : typeof data === "function"
        ? "function"
        : "none") as objectSubtypeOf<data>

export const hasObjectSubtype = <name extends ObjectSubtypeName>(
    data: object,
    name: name
): data is ObjectSubtypes[name] => objectSubtypeOf(data) === name
