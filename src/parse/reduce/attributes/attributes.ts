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
import type {
    SerializablePrimitive,
    SerializedPrimitive
} from "../../../utils/primitiveSerialization.js"
import type { Bounds } from "./bounds.js"

type DisjointAttributeTypes = {
    value: SerializablePrimitive
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

export type AttributeBranches =
    | { kind: "some" | "all"; of: Attributes[] }
    | DiscriminatedBranches

type DisjointKey = keyof DisjointAttributeTypes

type CaseKey<k extends DisjointKey = DisjointKey> = k extends "value"
    ? SerializedPrimitive
    : DynamicTypeName

export type DiscriminatedBranches<k extends DisjointKey = DisjointKey> = {
    kind: "switch"
    path: string
    key: k
    cases: AttributeCases<k>
}

type AttributeCases<k extends DisjointKey = DisjointKey> = {
    [_ in CaseKey<k> | "default"]?: Attributes
}

type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attribute<k extends AttributeKey> = AttributeTypes[k]

export type Attributes = { [k in AttributeKey]?: Attribute<k> }
