import type { dictionary, DynamicTypeName } from "../internal.js"
import type { Enclosed } from "../parser/operand/enclosed.js"
import type { BoundsData } from "./bounds.js"
import type { ValueAttribute } from "./value.js"

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
    aliases: keyOrKeySet<string>
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

export type TypeAttribute = keyOrKeySet<TypeAttributeName>

export type RegexAttribute = keyOrKeySet<Enclosed.RegexLiteral>

export type ContradictableKey = "value" | "type" | "bounds"

export type TypeAttributeName = Exclude<DynamicTypeName, "undefined" | "null">

export type keySet<key extends string> = Partial<Record<key, true>>

export type keyOrKeySet<key extends string> = key | keySet<key>

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
