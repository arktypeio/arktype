import type { evaluate, isTopType } from "./generics.js"

export type Types = {
    bigint: bigint
    boolean: boolean
    number: number
    object: object
    string: string
    symbol: symbol
    undefined: undefined
    null: null
}

export type ObjectSubtypes = {
    array: array
    function: Function
    dict: dict
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

export const hasType = <
    typeName extends TypeName,
    subtypeName extends typeName extends "object"
        ? ObjectSubtypeName | undefined
        : undefined = undefined
>(
    data: unknown,
    name: typeName,
    subtype?: subtypeName
): data is subtypeName extends ObjectSubtypeName
    ? ObjectSubtypes[subtypeName]
    : Types[typeName] =>
    typeOf(data) === name &&
    (!subtype || objectSubtypeOf(data as object) === subtype)

export const typeIn = <name extends TypeName>(
    data: unknown,
    names: Record<name, unknown>
): data is Types[name] => typeOf(data) in names

export type array<of = unknown> = readonly of[]

export type dict<of = unknown> = { readonly [k in string]: of }

export type ObjectSubtypeName = evaluate<keyof ObjectSubtypes>

export type objectSubtypeOf<data extends object> = data extends array
    ? "array"
    : data extends Function
    ? "function"
    : "dict"

export const objectSubtypeOf = (data: object): ObjectSubtypeName =>
    Array.isArray(data)
        ? "array"
        : typeof data === "function"
        ? "function"
        : "dict"

export const hasObjectSubtype = <name extends ObjectSubtypeName>(
    data: object,
    name: name
): data is ObjectSubtypes[name] => objectSubtypeOf(data) === name
