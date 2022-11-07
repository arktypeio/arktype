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

type ComposedAttributeTypes = {
    parent: Attributes
    baseProp: Attributes
    props: Readonly<dictionary<Attributes>>
    branches: AttributeBranches
}

export type AttributeBranches =
    | Attributes[]
    | DiscriminatedAttributeBranches<DisjointKey>

export type DiscriminatedAttributeBranches<key extends DisjointKey> = {
    readonly path: string
    readonly key: key
    readonly cases: AttributeCases<key>
}

export type AttributeCases<key extends DisjointKey> = {
    readonly [k in DisjointAttributeTypes[key] | "default"]?: Attributes
}

export type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attributes = { readonly [k in AttributeKey]?: AttributeTypes[k] }

export type TypeAttribute = DynamicTypeName
