import type { dictionary, DynamicTypeName, DynamicTypes } from "../internal.js"
import { isKeyOf } from "../internal.js"
import type { Enclosed } from "../parser/operand/enclosed.js"
import type { BigintLiteral, NumberLiteral } from "../parser/operand/numeric.js"
import {
    UnenclosedBigint,
    UnenclosedNumber
} from "../parser/operand/numeric.js"
import type { BoundsData } from "./bounds.js"

// TODO: Should they all be strings? Could have objects represent unions and
// arrays intersections, though not sure how often it'd work since branches with
// sets of attributes are not mergeable
type AtomicAttributeTypes = {
    value: ValueAttribute
    type: TypeAttribute
    divisor: number
    regex: RegexAttribute
    bounds: BoundsData
    // TODO: Fix. Do not need to worry about alias resolutions, only relevant
    // whether the parent explicitly specifies it.
    optional: true | undefined
    aliases: MaybeSetOf<string>
}

type ComposedAttributeTypes = {
    contradictions: Contradictions
    baseProp: Attributes
    props: dictionary<Attributes>
    branches: AttributeBranches
}

export type Attributes = Partial<AttributeTypes>

export type AttributeTypes = AtomicAttributeTypes & ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Contradictions = {
    [k in ContradictableKey]?: AtomicAttributeTypes[k][]
}

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

// TODO: Move to value attribute
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

export type ValueAttribute = MaybeSetOf<SerializedPrimitive>

export type TypeAttribute = MaybeSetOf<TypeAttributeName>

export type RegexAttribute = MaybeSetOf<Enclosed.RegexLiteral>

export type ContradictableKey = "value" | "type" | "bounds"

export type TypeAttributeName = Exclude<DynamicTypeName, "undefined" | "null">

export type AttributeSet<t extends string> = Partial<Record<t, true>>

export type MaybeSetOf<t extends string> = t | AttributeSet<t>

export const atomicAttributes: Record<AtomicKey, true> = {
    value: true,
    type: true,
    divisor: true,
    regex: true,
    bounds: true,
    optional: true,
    aliases: true
}

export type AtomicKey = keyof AtomicAttributeTypes

export type AttributeBranches = BranchUnion | BranchIntersection

export type BranchUnion = ["|", ...(Attributes | BranchIntersection)[]]

export type BranchIntersection = ["&", ...BranchUnion[]]
