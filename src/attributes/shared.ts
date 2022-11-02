import type { dictionary, DynamicTypeName } from "../internal.js"
import type { Enclosed } from "../parser/operand/enclosed.js"
import type { BoundsData } from "./bounds.js"

type AtomicAttributeTypes = {
    value: string | number | boolean | bigint | null | undefined
    type: TypeAttribute
    divisor: number
    regex: RegexAttribute
    bounds: BoundsData
    optional: true | undefined
    aliases: MaybeSetOf<string>
}

export type Contradictions = {
    [k in ContradictableKey]?: AtomicAttributeTypes[k][]
}

export type TypeAttribute = MaybeSetOf<TypeAttributeName>

export type RegexAttribute = MaybeSetOf<Enclosed.RegexLiteral>

export type ContradictableKey = "value" | "type" | "bounds"

export type TypeAttributeName = Exclude<DynamicTypeName, "undefined" | "null">

export type AttributeSet<t extends string | number> = Partial<Record<t, true>>

export type MaybeSetOf<t extends string | number> = t | AttributeSet<t>

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

type ComposedAttributeTypes = {
    contradictions: Contradictions
    baseProp: Attributes
    props: dictionary<Attributes>
    branches: AttributeBranches
}

export type BranchingOperator = "|" | "&"

export type AttributeBranches<
    operator extends BranchingOperator = BranchingOperator
> = [operator, ...(Attributes | AttributeBranches)[]]

export type AttributeTypes = AtomicAttributeTypes & ComposedAttributeTypes

export type Attributes = Partial<AttributeTypes>

export type AttributeKey = keyof AttributeTypes
