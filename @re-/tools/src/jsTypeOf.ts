import type { Dictionary, IsAnyOrUnknown } from "./common.js"
import type { Evaluate } from "./evaluate.js"

export type BuiltinJsTypes = {
    bigint: bigint
    boolean: boolean
    function: Function
    number: number
    object: object | null
    string: string
    symbol: symbol
    undefined: undefined
}

export type BuiltinJsTypeOf<Data> = Data extends Function
    ? "function"
    : Data extends object | null
    ? "object"
    : Data extends string
    ? "string"
    : Data extends number
    ? "number"
    : Data extends undefined
    ? "undefined"
    : Data extends boolean
    ? "boolean"
    : Data extends bigint
    ? "bigint"
    : "symbol"

export type BuiltinJsTypeName = keyof BuiltinJsTypes

export type NormalizedJsTypes = Evaluate<
    Omit<BuiltinJsTypes, "object"> & {
        object: Dictionary
        array: unknown[]
        null: null
    }
>

export type NormalizedJsTypeName = keyof NormalizedJsTypes

export type NormalizedJsTypeOf<Data> = IsAnyOrUnknown<Data> extends true
    ? NormalizedJsTypeName
    : Data extends readonly unknown[]
    ? "array"
    : Data extends null
    ? "null"
    : BuiltinJsTypeOf<Data>

export const jsTypeOf = <Data>(data: Data) =>
    (Array.isArray(data)
        ? "array"
        : data === null
        ? "null"
        : typeof data) as NormalizedJsTypeOf<Data>

export const hasJsType = <TypeName extends NormalizedJsTypeName>(
    data: unknown,
    typeName: TypeName
): data is NormalizedJsTypes[TypeName] => jsTypeOf(data) === typeName
