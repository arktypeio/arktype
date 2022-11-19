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
        alias: keyOrSet<string>
        contradiction: keyOrSet<string>
    }
>

type ComposedAttributeTypes = {
    props: dictionary<Attributes>
    branches: AttributeBranches
}

type ReducibleAttributeTypes = DisjointAttributeTypes & AdditiveAttributeTypes

export type DisjointKey = keyof DisjointAttributeTypes

export type CaseKey<k extends DisjointKey = DisjointKey> =
    | "default"
    | (k extends "value" ? SerializedPrimitive : DynamicTypeName)

export type AttributeBranches = UnionBranches | IntersectedBranches

export type UnionBranches = UndiscriminatedBranches | DiscriminatedBranches

export type IntersectedBranches = [token: "&", members: UnionBranches[]]

export type UndiscriminatedBranches = [token: "|", members: Attributes[]]

export type DiscriminatedBranches<k extends DisjointKey = DisjointKey> = [
    token: "?",
    path: AttributePath<k>,
    cases: AttributeCases<k>
]

export type AttributePath<k extends AttributeKey = AttributeKey> =
    | k
    | `${string}.${k}`

type AttributeCases<k extends DisjointKey = DisjointKey> = {
    [_ in CaseKey<k> | "default"]?: Attributes
}

type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attribute<k extends AttributeKey> = AttributeTypes[k]

export type Attributes = { [k in AttributeKey]?: Attribute<k> }

export type BranchedAttributes<
    branches extends AttributeBranches = AttributeBranches
> = Attributes & {
    branches: branches
}
