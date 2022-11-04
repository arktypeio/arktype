import type { dictionary, DynamicTypeName } from "../../internal.js"
import type { Enclosed } from "../operand/enclosed.js"
import type { BoundsAttribute } from "../operator/bounds/shared.js"
import type { EmptyIntersectionResult } from "./intersection.js"
import type { ValueAttribute } from "./value.js"

type AtomicAttributeTypes = Readonly<{
    value: ValueAttribute
    type: TypeAttribute
    divisor: number
    regex: RegexAttribute
    bounds: BoundsAttribute
    requiredKeys: keySet<string>
    aliases: keyOrKeySet<string>
}>

type ComposedAttributeTypes = Readonly<{
    contradictions: Contradictions
    baseProp: Attributes
    props: Readonly<dictionary<Attributes>>
    branches: AttributeBranches
}>

export type Contradictions = {
    readonly [k in ContradictionKind]?: k extends ContradictableKey
        ? EmptyIntersectionResult<k>
        : true
}

export type AttributeBranches = BranchUnion | BranchIntersection

export type BranchUnion = readonly ["|", ...(Attributes | BranchIntersection)[]]

export type BranchIntersection = readonly ["&", ...BranchUnion[]]

export type Attributes = Partial<AttributeTypes>

export type AttributeTypes = AtomicAttributeTypes & ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type TypeAttribute = keyOrKeySet<TypeAttributeName>

export type RegexAttribute = keyOrKeySet<Enclosed.RegexLiteral>

export type ContradictableKey = "value" | "type" | "bounds"

export type ContradictionKind = ContradictableKey | "never"

export type TypeAttributeName = Exclude<DynamicTypeName, "undefined" | "null">

export type keySet<key extends string> = { [_ in key]?: true }

export type keyOrKeySet<key extends string> = key | keySet<key>

export const atomicAttributes: keySet<AtomicKey> = {
    value: true,
    type: true,
    divisor: true,
    regex: true,
    bounds: true,
    requiredKeys: true,
    aliases: true
}

export type AtomicKey = keyof AtomicAttributeTypes
