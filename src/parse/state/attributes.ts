import type { dictionary, DynamicTypeName } from "../../utils/dynamicTypes.js"
import type { Enclosed } from "../operand/enclosed.js"
import type { BoundsAttribute } from "../operator/bounds/shared.js"
import type { EmptyIntersectionResult } from "./intersection.js"
import type { ValueAttribute } from "./value.js"

type AtomicAttributeTypes = {
    readonly value?: ValueAttribute
    readonly type?: TypeAttribute
    readonly divisor?: number
    readonly regex?: RegexAttribute
    readonly bounds?: BoundsAttribute
    readonly requiredKeys?: keySet<string>
    readonly aliases?: keyOrKeySet<string>
}

type ComposedAttributeTypes = {
    readonly contradictions?: Contradictions
    readonly parent?: Attributes
    readonly baseProp?: Attributes
    readonly props?: Readonly<dictionary<Attributes>>
    readonly branches?: AttributeBranches
}

export type Contradictions = {
    readonly [k in ContradictionKind]?: k extends ContradictableKey
        ? EmptyIntersectionResult<k>
        : true
}

export type AttributeBranches = readonly [
    path: string,
    attributesOrBranches: {
        readonly [k in string]: Attributes | AttributeBranches
    }
]

export type Attributes = AtomicAttributeTypes & ComposedAttributeTypes

export type AttributeKey = keyof Attributes

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
