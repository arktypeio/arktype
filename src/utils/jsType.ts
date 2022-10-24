import type { Evaluate, IsTopType } from "./generics.js"

export namespace JsType {
    type BuiltinInferences = {
        bigint: bigint
        boolean: boolean
        function: Function
        number: number
        object: object | null
        string: string
        symbol: symbol
        undefined: undefined
    }

    type BuiltinOf<Data> = Data extends Function
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

    type NormalizedInferences = Evaluate<
        Omit<BuiltinInferences, "object"> & {
            object: Record<string, unknown>
            array: unknown[]
            null: null
        }
    >

    export type NormalizedOf<Data> = IsTopType<Data> extends true
        ? NormalizedName
        : Data extends readonly unknown[]
        ? "array"
        : Data extends null
        ? "null"
        : BuiltinOf<Data>

    export type NormalizedName = keyof BuiltinInferences | "array" | "null"

    export const of = <Data>(data: Data) =>
        (Array.isArray(data)
            ? "array"
            : data === null
            ? "null"
            : typeof data) as NormalizedOf<Data>

    export const is = <TypeName extends NormalizedName>(
        data: unknown,
        typeName: TypeName
    ): data is NormalizedInferences[TypeName] => of(data) === typeName

    export const isIn = <TypeName extends NormalizedName>(
        data: unknown,
        typeNames: Record<TypeName, unknown>
    ): data is NormalizedInferences[TypeName] => of(data) in typeNames
}
