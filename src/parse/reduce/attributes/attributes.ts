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
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import type { SerializedPrimitive } from "../../../utils/primitiveSerialization.js"
import type { SerializedBounds } from "./serialization.js"

type DisjointAttributeTypes = {
    value: SerializedPrimitive
    type: DynamicTypeName
}

type AdditiveAttributeTypes = {
    divisor: NumberLiteral
    bounds: SerializedBounds
}

type IrreducibleAttributeTypes = subtype<
    dictionary<keyOrSet<string>>,
    {
        regex: keyOrSet<RegexLiteral>
        requiredKeys: keySet<string>
        alias: keyOrSet<string>
    }
>

type ComposedAttributeTypes = {
    props: dictionary<Attributes>
    branches: AttributeBranches
}

type ReducibleAttributeTypes = subtype<
    dictionary<string>,
    DisjointAttributeTypes & AdditiveAttributeTypes
>

export type AttributeBranches =
    | { kind: "some" | "all"; of: Attributes[] }
    | DiscriminatedBranches

type DisjointKey = keyof DisjointAttributeTypes

export type DiscriminatedBranches<key extends DisjointKey = DisjointKey> = {
    kind: "switch"
    path: string
    key: key
    cases: AttributeCases<key>
}

type AttributeCases<key extends DisjointKey = DisjointKey> = {
    [k in Attribute<key> | "default"]?: Attributes
}

type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attribute<k extends AttributeKey> = AttributeTypes[k]

export type Attributes = { [k in AttributeKey]?: Attribute<k> }
