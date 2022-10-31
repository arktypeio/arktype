import type { dictionary, DynamicTypeName } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import type { BoundsString } from "./bounds.js"

export type IntersectionReducer<key extends AttributeKey> = (
    base: AttributeTypes[key],
    value: AttributeTypes[key]
) => AttributeTypes[key] | Contradiction

type AtomicAttributeTypes = {
    value: string | number | boolean | bigint | null | undefined
    type: DynamicTypeName
    divisor: number
    regex: Enclosed.RegexLiteral
    bounds: BoundsString
}

export const atomicAttributes: Record<AtomicKey, true> = {
    value: true,
    type: true,
    divisor: true,
    regex: true,
    bounds: true
}

type AtomicKey = keyof AtomicAttributeTypes

type ComposedAttributeTypes = {
    baseProp: Attributes
    props: dictionary<Attributes>
    branches: Attributes[][]
}

type TransientAttributeTypes = {
    parent: Attributes
    contradiction: Contradiction
}

export type Contradiction<key extends AtomicKey = AtomicKey> = {
    key: key
    base: AtomicAttributeTypes[key]
    conflicting: AtomicAttributeTypes[key]
}

export const isContradiction = (result: object): result is Contradiction =>
    "conflicting" in result

export type AttributeTypes = AtomicAttributeTypes &
    ComposedAttributeTypes &
    TransientAttributeTypes

export type Attributes = Partial<AttributeTypes>

export type AttributeKey = keyof AttributeTypes

// Calculate the GCD, then divide the product by that to determine the LCM:
// https://en.wikipedia.org/wiki/Euclidean_algorithm
const leastCommonMultiple = (x: number, y: number) => {
    let previous
    let greatestCommonDivisor = x
    let current = y
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return Math.abs((x * y) / greatestCommonDivisor)
}
