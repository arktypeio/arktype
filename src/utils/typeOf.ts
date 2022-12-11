import type {
    classOf,
    Dictionary,
    evaluate,
    isTopType,
    List
} from "./generics.js"
import { isKeyOf } from "./generics.js"

export const hasType = <data, typeName extends TypeName>(
    data: data,
    type: typeName
): data is Extract<data, Types[typeName]> => typeOf(data as any) === type

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

// Built-in objects that can be returned from
// Object.prototype.toString.call(<value>). Based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export type ObjectSubtypes = {
    Array: readonly unknown[]
    Date: Date
    Error: Error
    Function: Function
    Map: Map<unknown, unknown>
    Object: Dictionary
    RegExp: RegExp
    Set: Set<unknown>
}

export type ObjectSubtypeName = keyof ObjectSubtypes

const objectSubtypes = {
    Array,
    Date,
    Error,
    Function,
    Map,
    Object: Object as unknown as classOf<Dictionary>,
    RegExp,
    Set
} satisfies {
    [k in ObjectSubtypeName]: classOf<ObjectSubtypes[k]>
}

export type typeOfObject<data extends object> = object extends data
    ? ObjectSubtypeName
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

const rawObjectTypeOf = (data: object): ObjectSubtypeName => {
    if (Array.isArray(data)) {
        return "Array"
    }
    // The raw result will be something like [object Date]
    const prototypeName = Object.prototype.toString.call(data).slice(8, -1)
    if (isKeyOf(prototypeName, objectSubtypes)) {
        return data instanceof objectSubtypes[prototypeName]
            ? prototypeName
            : // If the prototype has the same name as one of the builtin types but isn't an instance of it, fall back to Object
              "Object"
    }
    if (prototypeName.endsWith("Error")) {
        return data instanceof Error ? "Error" : "Object"
    }
    return "Object"
}

export const hasObjectSubtype = <subtype extends ObjectSubtypeName>(
    data: unknown,
    subtype: subtype
): data is ObjectSubtypes[subtype] =>
    hasType(data, "object") && rawObjectTypeOf(data) === subtype
