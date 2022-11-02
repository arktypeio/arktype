import type { array, dictionary, DynamicTypeName, xor } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import type { BoundsString } from "./bounds.js"

type AtomicAttributeTypes = {
    value: string | number | boolean | bigint | null | undefined
    type: TypeAttribute
    divisor: number
    regex: Enclosed.RegexLiteral
    bounds: BoundsString
    optional: true | undefined
    alias: string
}

export type Contradictions = {
    [k in ContradictableKey]?: AtomicAttributeTypes[k][]
}

export type ContradictableKey = "value" | "type" | "bounds"

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

export type AtomicKey = keyof AtomicAttributeTypes

type ComposedAttributeTypes = {
    contradictions: Contradictions
    baseProp: Attributes
    props: dictionary<Attributes>
    branches: AttributeBranches
}

export type AttributeBranches = xor<
    {
        "|": array<Attributes | AttributeBranches>
    },
    {
        "&": array<Attributes | AttributeBranches>
    }
>

export type AttributeTypes = AtomicAttributeTypes & ComposedAttributeTypes

export type Attributes = Partial<AttributeTypes>

export type AttributeKey = keyof AttributeTypes
