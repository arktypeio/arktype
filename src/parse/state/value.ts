import type { DynamicTypes } from "../../internal.js"
import { isKeyOf } from "../../internal.js"
import type { Enclosed } from "../operand/enclosed.js"
import type { BigintLiteral, NumberLiteral } from "../operand/numeric.js"
import { UnenclosedBigint, UnenclosedNumber } from "../operand/numeric.js"
import type { keyOrKeySet } from "./attributes.js"

export type SerializedPrimitives = {
    string: Enclosed.SingleQuotedStringLiteral
    number: NumberLiteral
    bigint: BigintLiteral
    boolean: "true" | "false"
    null: "null"
    undefined: "undefined"
}

export type SerializedPrimitive =
    SerializedPrimitives[keyof SerializedPrimitives]

export type SerializablePrimitive = DynamicTypes[keyof SerializedPrimitives]

export const deserializePrimitive = <serialized extends SerializedPrimitive>(
    serialized: serialized
) =>
    (isKeyOf(serialized, serializedKeywords)
        ? serializedKeywords[serialized]
        : serialized[0] === "'"
        ? serialized.slice(1, -1)
        : UnenclosedBigint.parseWellFormed(serialized) ??
          UnenclosedNumber.parseWellFormed(
              serialized,
              "number",
              true
          )) as deserializePrimitive<serialized>

export type deserializePrimitive<serialized extends SerializedPrimitive> =
    serialized extends keyof SerializedKeywords
        ? SerializedKeywords[serialized]
        : serialized extends Enclosed.SingleQuotedStringLiteral
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

export type ValueAttribute = keyOrKeySet<SerializedPrimitive>
