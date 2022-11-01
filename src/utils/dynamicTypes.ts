import type { isTopType } from "./generics.js"

export type dictionary<of = unknown> = Record<string, of>

export type array<of = unknown> = of[]

type builtinDyanmicTypeOfNonObject<data> = data extends Function
    ? "function"
    : data extends string
    ? "string"
    : data extends number
    ? "number"
    : data extends undefined
    ? "undefined"
    : data extends boolean
    ? "boolean"
    : data extends bigint
    ? "bigint"
    : "symbol"

export type DynamicTypes = {
    bigint: bigint
    boolean: boolean
    function: Function
    number: number
    string: string
    symbol: symbol
    undefined: undefined
    dictionary: dictionary
    array: array
    null: null
}

export type dynamicTypeOf<data> = isTopType<data> extends true
    ? DynamicTypeName
    : data extends readonly unknown[]
    ? "array"
    : data extends null
    ? "null"
    : builtinDyanmicTypeOfNonObject<data>

export type DynamicTypeName = keyof DynamicTypes

export const dynamicTypeOf = <data>(data: data) => {
    const builtinType = typeof data
    return (
        builtinType === "object"
            ? Array.isArray(data)
                ? "array"
                : data === null
                ? "null"
                : "dictionary"
            : builtinType
    ) as dynamicTypeOf<data>
}

export const hasDynamicType = <name extends DynamicTypeName>(
    data: unknown,
    name: name
): data is DynamicTypes[name] => dynamicTypeOf(data) === name

export const hasDynamicTypeIn = <name extends DynamicTypeName>(
    data: unknown,
    names: Record<name, unknown>
): data is DynamicTypes[name] => dynamicTypeOf(data) in names
