import { prototype } from "mocha"
import type { SingleQuotedStringLiteral } from "../parse/shift/operand/enclosed.js"
import type {
    array,
    classOf,
    dict,
    evaluate,
    isTopType,
    subtype
} from "./generics.js"
import { isKeyOf } from "./generics.js"
import type {
    BigintLiteral,
    IntegerLiteral,
    NumberLiteral
} from "./numericLiterals.js"

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
        [k in TypeName]: dict
    },
    {
        bigint: {
            [k in BigintLiteral]: k extends BigintLiteral<infer value>
                ? value
                : never
        }
        boolean: {
            true: true
            false: false
        }
        number: {
            [k in NumberLiteral]: k extends NumberLiteral<infer value>
                ? value
                : never
        }
        object: ObjectSubtypes
        string: {
            [k in SingleQuotedStringLiteral]: k extends SingleQuotedStringLiteral<
                infer value
            >
                ? value
                : never
        }
        symbol: never
        undefined: never
        null: never
    }
>

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

export const subtypeOf = <data>(data: data) =>
    hasType(data, "object") ? objectSubtypeOf(data) : {}

export const hasType = <
    typeName extends TypeName,
    subtype extends Subtypes[typeName]
>(
    data: unknown,
    name: typeName,
    subtype?: subtype
): data is inferType<typeName, subtype> =>
    typeOf(data) === name &&
    (!subtype || rawObjectSubtypeOf(data as object) === subtype)

type inferType<
    typeName extends TypeName,
    subtype
> = subtype extends Subtypes[typeName] ? subtype : Types[typeName]

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

type ObjectSubtypeName = keyof ObjectSubtypes

const objectSubtypes = {
    Array,
    Date,
    Error,
    Function,
    Map,
    Object: Object as unknown as classOf<dict>,
    RegExp,
    Set
} satisfies {
    [k in ObjectSubtypeName]: classOf<ObjectSubtypes[k]>
}

export type objectSubtypeOf<data extends object> = data extends array
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

export const objectSubtypeOf = <data extends object>(data: data) =>
    rawObjectSubtypeOf(data) as objectSubtypeOf<data>

const rawObjectSubtypeOf = (data: object): ObjectSubtypeName => {
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
    data: object,
    subtype: subtype
): data is ObjectSubtypes[subtype] => rawObjectSubtypeOf(data) === subtype
