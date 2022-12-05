import type { evaluate, isTopType, subtype } from "./generics.js"
import type { IntegerLiteral, NumberLiteral } from "./numericLiterals.js"

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

export type TypeName = evaluate<keyof Types>

export type Subtypes = subtype<
    {
        [k in TypeName]?: string
    },
    {
        bigint: IntegerLiteral
        boolean: "true" | "false"
        number: NumberLiteral
        object: ObjectSubtypeName
        string: string
    }
>

// Built-in objects that can be returned from
// Object.prototype.toString.call(<value>). Based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export type ObjectSubtypes = {
    Array: array
    Date: Date
    Error: Error
    Function: Function
    Map: Map<unknown, unknown>
    Object: dict
    RegExp: RegExp
    Set: Set<unknown>
}
export type ObjectSubtypeName = evaluate<keyof ObjectSubtypes>

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
        ? ObjectSubtypeName
        : undefined
>(
    data: unknown,
    name: typeName,
    subtype?: subtypeName
): data is subtypeName extends ObjectSubtypeName
    ? ObjectSubtypes[subtypeName]
    : Types[typeName] =>
    typeOf(data) === name &&
    (!subtype || objectSubtypeOf(data as object) === subtype)

export const hasTypeIn = <name extends TypeName>(
    data: unknown,
    names: Record<name, unknown>
): data is Types[name] => typeOf(data) in names

export type array<of = unknown> = readonly of[]

export type dict<of = unknown> = { readonly [k in string]: of }

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
