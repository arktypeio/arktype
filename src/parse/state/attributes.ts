import type { dictionary, DynamicTypeName } from "../../utils/dynamicTypes.js"
import type { keyOrKeySet, keySet, subtype } from "../../utils/generics.js"
import type { NumberLiteral } from "../../utils/numericLiterals.js"
import type { Enclosed } from "../operand/enclosed.js"
import type { BoundsString } from "../operator/bounds/shared.js"
import type { SerializedPrimitive } from "./value.js"

type DisjointAttributeTypes = {
    value: SerializedPrimitive
    type: TypeAttribute
}

export type DisjointKey = keyof DisjointAttributeTypes

export const disjointKeys: Record<DisjointKey, true> = {
    type: true,
    value: true
}

type AdditiveAttributeTypes = {
    divisor: NumberLiteral
    bounds: BoundsString
}

type ReducibleAttributeTypes = subtype<
    dictionary<string>,
    DisjointAttributeTypes & AdditiveAttributeTypes
>

type IrreducibleAttributeTypes = subtype<
    dictionary<keyOrKeySet<string>>,
    {
        regex: keyOrKeySet<Enclosed.RegexLiteral>
        requiredKeys: keySet<string>
        alias: keyOrKeySet<string>
        contradiction: keyOrKeySet<string>
    }
>

type BranchAttributeTypes = {
    switch: DiscriminatedAttributeBranches
    some: Attributes[]
    every: Attributes[][]
}

type ComposedAttributeTypes = {
    props: dictionary<Attributes>
} & BranchAttributeTypes

export const branchKeys: Record<BranchAttributeKey, true> = {
    switch: true,
    some: true,
    every: true
} as const

export type BranchAttributeKey = keyof BranchAttributeTypes

export type AttributeBranches = Attributes[] | DiscriminatedAttributeBranches

export type DiscriminatedAttributeBranches<
    key extends DisjointKey = DisjointKey
> = {
    path: string
    key: key
    cases: AttributeCases<key>
}

export type AttributeCases<key extends DisjointKey> = {
    [k in DisjointAttributeTypes[key] | "default"]?: Attributes
}

export type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attributes = { [k in AttributeKey]?: AttributeTypes[k] }

export type TypeAttribute = DynamicTypeName
