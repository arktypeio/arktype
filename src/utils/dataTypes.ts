import type { evaluate, isTopType, mutable } from "./generics.js"

export type DataTypes = {
    bigint: bigint
    boolean: boolean
    number: number
    object: object
    string: string
    symbol: symbol
    undefined: undefined
    null: null
}

export type DataTypeName = evaluate<keyof DataTypes>

export type dataTypeOf<data> = isTopType<data> extends true
    ? DataTypeName
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

export const dataTypeOf = <data>(data: data) => {
    const builtinType = typeof data
    return (
        builtinType === "object"
            ? data === null
                ? "null"
                : "object"
            : builtinType === "function"
            ? "object"
            : builtinType
    ) as dataTypeOf<data>
}

export const hasDataType = <name extends DataTypeName>(
    data: unknown,
    name: name
): data is DataTypes[name] => dataTypeOf(data) === name

export const hasDataTypeIn = <name extends DataTypeName>(
    data: unknown,
    names: Record<name, unknown>
): data is DataTypes[name] => dataTypeOf(data) in names

export type ObjectSubtypes = {
    array: array
    function: Function
    record: record
}

export type array<of = unknown> = readonly of[]

export type record<of = unknown> = { readonly [k in string]: of }

export type ObjectSubtypeName = evaluate<keyof ObjectSubtypes>

export type objectSubtypeOf<data extends object> = data extends object
    ? ObjectSubtypeName
    : data extends array
    ? "array"
    : data extends Function
    ? "function"
    : data extends record
    ? "record"
    : never

export const objectSubtypeOf = <data extends object>(data: data) =>
    (Array.isArray(data)
        ? "array"
        : typeof data === "function"
        ? "function"
        : "record") as objectSubtypeOf<data>

export const hasObjectSubtype = <name extends ObjectSubtypeName>(
    data: object,
    name: name
): data is ObjectSubtypes[name] => objectSubtypeOf(data) === name
