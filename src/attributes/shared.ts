import type { dictionary, DynamicTypeName } from "../internal.js"
import { hasDynamicType } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import type { BoundsString } from "./bounds.js"

export type IntersectionReducer<key extends AttributeKey> = (
    base: AttributeTypes[key],
    value: AttributeTypes[key],
    context: DynamicParserContext
) => AttributeTypes[key] | Contradiction

type AtomicAttributeTypes = {
    value: string | number | boolean | bigint | null | undefined
    type: TypeAttribute
    divisor: number
    regex: Enclosed.RegexLiteral
    bounds: BoundsString
    optional: true | undefined
    alias: string
}

export type TypeAttribute = Exclude<DynamicTypeName, "undefined" | "null">

export const atomicAttributes: Record<AtomicKey, true> = {
    value: true,
    type: true,
    divisor: true,
    regex: true,
    bounds: true,
    optional: true,
    alias: true
}

type AtomicKey = keyof AtomicAttributeTypes

type ComposedAttributeTypes = {
    contradictions: Contradiction[]
    baseProp: Attributes
    props: dictionary<Attributes>
    branches: AttributeBranches
}

export type AttributeBranches = [
    "|" | "&",
    ...(Attributes | AttributeBranches)[]
]

export type Contradiction<key extends AtomicKey = AtomicKey> = {
    key: key
    contradiction: [AtomicAttributeTypes[key], AtomicAttributeTypes[key]]
}

export const isContradiction = (result: unknown): result is Contradiction =>
    hasDynamicType(result, "dictionary") && "contradiction" in result

export type AttributeTypes = AtomicAttributeTypes & ComposedAttributeTypes

export type Attributes = Partial<AttributeTypes>

export type AttributeKey = keyof AttributeTypes
