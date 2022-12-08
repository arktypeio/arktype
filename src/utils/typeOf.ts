import type {
    classOf,
    Dictionary,
    evaluate,
    isTopType,
    List,
    narrow,
    Narrowable,
    subtype
} from "./generics.js"
import { isKeyOf } from "./generics.js"
import type { IntegerLiteral } from "./numericLiterals.js"

export const hasType = <
    data,
    typeName extends TypeName,
    subtype extends Subtypes[typeName]
>(
    data: data,
    type: typeName,
    subtype?: subtype
): data is Extract<data, inferType<typeName, subtype>> =>
    subtype === undefined
        ? typeOf(data as any) === type
        : subtypeOf(data as any) === `${type}/${subtype}`

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

export type PrimitiveTypeName = Exclude<TypeName, "object">

export type Primitive = Types[PrimitiveTypeName]

type BasePrimitiveSubtype = string | number | boolean

export type Subtypes = subtype<
    {
        [k in TypeName]: BasePrimitiveSubtype
    },
    {
        bigint: IntegerLiteral
        boolean: boolean
        number: number
        object: ObjectTypeName
        string: string
        symbol: never
        undefined: never
        null: never
    }
>

const nonNarrowablePrimitives = {
    undefined: true,
    null: true,
    symbol: true
}

type NonNarrowablePrimitive = Types[keyof typeof nonNarrowablePrimitives]

export type typeOf<data> = isTopType<data> extends true
    ? TypeName
    : baseTypeOf<data>

type baseTypeOf<data> = data extends object
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

export type subtypeOf<data> = isTopType<data> extends true
    ? `${TypeName}/${string}`
    : data extends NonNarrowablePrimitive
    ? baseTypeOf<data>
    : `${baseTypeOf<data>}/${data extends object
          ? typeOfObject<data>
          : data & Narrowable}`

type shallowNarrow<t> = t extends object ? t : narrow<t>

export const subtypeOf = <data>(data: shallowNarrow<data>) => {
    const baseTypeName = typeOf(data)
    return (
        isKeyOf(baseTypeName, nonNarrowablePrimitives)
            ? baseTypeName
            : `${baseTypeName}/${
                  baseTypeName === "object"
                      ? typeOfObject(data as object)
                      : `${data}`
              }`
    ) as subtypeOf<data>
}

type inferType<
    typeName extends TypeName,
    subtype extends Subtypes[typeName]
> = Subtypes[typeName] extends subtype
    ? Types[typeName]
    : typeName extends "object"
    ? ObjectTypes[subtype & ObjectTypeName]
    : typeName extends "bigint"
    ? subtype extends IntegerLiteral<infer value>
        ? value
        : never
    : subtype

// Built-in objects that can be returned from
// Object.prototype.toString.call(<value>). Based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export type ObjectTypes = {
    Array: readonly unknown[]
    Date: Date
    Error: Error
    Function: Function
    Map: Map<unknown, unknown>
    Object: Dictionary
    RegExp: RegExp
    Set: Set<unknown>
}

export type ObjectTypeName = keyof ObjectTypes

const objectTypes = {
    Array,
    Date,
    Error,
    Function,
    Map,
    Object: Object as unknown as classOf<Dictionary>,
    RegExp,
    Set
} satisfies {
    [k in ObjectTypeName]: classOf<ObjectTypes[k]>
}

export type typeOfObject<data extends object> = object extends data
    ? ObjectTypeName
    : data extends List
    ? "Array"
    : data extends Date
    ? "Date"
    : data extends Error
    ? "Error"
    : data extends Function
    ? "Function"
    : data extends Map<unknown, unknown>
    ? "Map"
    : data extends RegExp
    ? "RegExp"
    : data extends Set<unknown>
    ? "Set"
    : "Object"

export const typeOfObject = <data extends object>(data: data) =>
    rawObjectTypeOf(data) as typeOfObject<data>

const rawObjectTypeOf = (data: object): ObjectTypeName => {
    if (Array.isArray(data)) {
        return "Array"
    }
    // The raw result will be something like [object Date]
    const prototypeName = Object.prototype.toString.call(data).slice(8, -1)
    if (isKeyOf(prototypeName, objectTypes)) {
        return data instanceof objectTypes[prototypeName]
            ? prototypeName
            : // If the prototype has the same name as one of the builtin types but isn't an instance of it, fall back to Object
              "Object"
    }
    if (prototypeName.endsWith("Error")) {
        return data instanceof Error ? "Error" : "Object"
    }
    return "Object"
}

export const hasObjectType = <subtype extends ObjectTypeName>(
    data: object,
    subtype: subtype
): data is ObjectTypes[subtype] => rawObjectTypeOf(data) === subtype
