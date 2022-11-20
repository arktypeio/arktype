import type {
    dictionary,
    DynamicTypeName
} from "../../../utils/dynamicTypes.js"
import type {
    keyOrSet,
    keySet,
    RegexLiteral,
    subtype
} from "../../../utils/generics.js"
import type { SerializedPrimitive } from "../../../utils/primitiveSerialization.js"
import type { Bounds } from "./bounds.js"

type DisjointAttributeTypes = {
    value: SerializedPrimitive
    type: DynamicTypeName
}

type AdditiveAttributeTypes = {
    divisor: number
    bounds: Bounds
}

type IrreducibleAttributeTypes = subtype<
    dictionary<keyOrSet<string>>,
    {
        regex: keyOrSet<RegexLiteral>
        requiredKeys: keySet<string>
        alias: string
        contradiction: keyOrSet<string>
    }
>

type ComposedAttributeTypes<compiled extends boolean> = {
    props: dictionary<AttributeState<compiled>>
    branches: AttributeBranches<compiled>
}

type ReducibleAttributeTypes = DisjointAttributeTypes & AdditiveAttributeTypes

export type DisjointKey = keyof DisjointAttributeTypes

export type CaseKey<k extends DisjointKey = DisjointKey> =
    | "default"
    | (k extends "value" ? SerializedPrimitive : DynamicTypeName)

export type AttributeBranches<compiled extends boolean> =
    | UnionBranches<compiled>
    | IntersectedBranches<compiled>

export type UnionBranches<compiled extends boolean> = compiled extends true
    ? UndiscriminatedBranches<true> | DiscriminatedBranches
    : UndiscriminatedBranches<false>

export type UndiscriminatedBranches<compiled extends boolean> = [
    token: "|",
    members: AttributeState<compiled>[]
]

export type IntersectedBranches<compiled extends boolean> = [
    token: "&",
    members: UnionBranches<compiled>[]
]

export type DiscriminatedBranches<k extends DisjointKey = DisjointKey> = [
    token: "?",
    path: AttributePath<k>,
    cases: AttributeCases<k>
]

export type AttributePath<k extends AttributeKey = AttributeKey> =
    | k
    | `${string}.${k}`

type AttributeCases<k extends DisjointKey = DisjointKey> = {
    [_ in CaseKey<k> | "default"]?: CompiledAttributes
}

type AttributeTypes<compiled extends boolean> = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes<compiled>

export type AttributeKey = keyof AttributeTypes<boolean>

export type Attribute<k extends AttributeKey> = AttributeTypes<false>[k]

export type CompiledAttribute<k extends AttributeKey> = AttributeTypes<true>[k]

type AttributeState<compiled extends boolean> = compiled extends true
    ? CompiledAttributes
    : Attributes

export type Attributes = {
    [k in AttributeKey]?: Attribute<k>
}

export type CompiledAttributes = {
    [k in AttributeKey]?: CompiledAttribute<k>
}
