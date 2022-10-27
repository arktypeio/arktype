import type { Evaluate, IsTopType } from "./generics.js"

export type dictionary<of = unknown> = Record<string, of>

export type array<of = unknown> = of[]

type BuiltinDynamicObject = dictionary | array | null

type BuiltinDynamicTypes = {
    bigint: bigint
    boolean: boolean
    function: Function
    number: number
    object: BuiltinDynamicObject
    string: string
    symbol: symbol
    undefined: undefined
}

type builtinDyanmicTypeOf<data> = data extends Function
    ? "function"
    : data extends BuiltinDynamicObject
    ? "object"
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

export type DynamicTypes = Evaluate<
    Omit<BuiltinDynamicTypes, "object"> & {
        dictionary: dictionary
        array: array
        null: null
    }
>

export type dynamicTypeOf<data> = IsTopType<data> extends true
    ? DynamicTypeName
    : data extends readonly unknown[]
    ? "array"
    : data extends null
    ? "null"
    : builtinDyanmicTypeOf<data>

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
