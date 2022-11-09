import type {
    dynamicTypeOf,
    DynamicTypes
} from "../../../utils/dynamicTypes.js"
import { isKeyOf } from "../../../utils/generics.js"
import type {
    BigintLiteral,
    NumberLiteral
} from "../../../utils/numericLiterals.js"
import {
    parseWellFormedBigint,
    parseWellFormedNumber
} from "../../../utils/numericLiterals.js"
import type { SingleQuotedStringLiteral } from "../../operand/enclosed.js"

export type SerializedPrimitives = {
    string: SingleQuotedStringLiteral
    number: NumberLiteral
    bigint: BigintLiteral
    boolean: "true" | "false"
    null: "null"
    undefined: "undefined"
}

export type SerializedPrimitive =
    SerializedPrimitives[keyof SerializedPrimitives]

export type SerializablePrimitive = DynamicTypes[keyof SerializedPrimitives]

export const serializePrimitive = <value extends SerializablePrimitive>(
    value: value
) =>
    (typeof value === "string"
        ? `'${value}'`
        : typeof value === "bigint"
        ? `${value}n`
        : `${value}`) as serializePrimitive<value>

export type serializePrimitive<value extends SerializablePrimitive> =
    value extends string
        ? `'${value}'`
        : value extends bigint
        ? `${value}n`
        : `${value}`

export const deserializePrimitive = <serialized extends SerializedPrimitive>(
    serialized: serialized
) =>
    (isKeyOf(serialized, serializedKeywords)
        ? serializedKeywords[serialized]
        : serialized[0] === "'"
        ? serialized.slice(1, -1)
        : parseWellFormedBigint(serialized) ??
          parseWellFormedNumber(
              serialized,
              true
          )) as deserializePrimitive<serialized>

export type deserializePrimitive<serialized extends SerializedPrimitive> =
    serialized extends keyof SerializedKeywords
        ? SerializedKeywords[serialized]
        : serialized extends SingleQuotedStringLiteral
        ? string
        : serialized extends BigintLiteral
        ? bigint
        : number

const serializedKeywords = {
    true: true,
    false: false,
    undefined,
    null: null
} as const

type SerializedKeywords = typeof serializedKeywords
