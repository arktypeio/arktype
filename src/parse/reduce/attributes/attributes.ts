import type {
    dictionary,
    DynamicTypeName,
    DynamicTypeName
} from "../../../utils/dynamicTypes.js"
import type {
    keyOrSet,
    keyOrSet,
    keySet,
    keySet,
    RegexLiteral,
    RegexLiteral,
    subtype
} from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import type {
    SerializablePrimitive,
    SerializedPrimitive
} from "../../../utils/primitiveSerialization.js"
import type { DiscriminatedBranches } from "../union/discriminate.js"
import type { SerializedKey } from "./serialization.js"
import { deserializers, serializers } from "./serialization.js"

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

type UndiscriminatedBranches = Attributes[]

type IntersectedBranches = ["&", ...Attributes[]]

export type AttributeBranches =
    | DiscriminatedBranches
    | UndiscriminatedBranches
    | IntersectedBranches

type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attribute<k extends AttributeKey> = AttributeTypes[k]

export type Attributes = { [k in AttributeKey]?: Attribute<k> }

export type ReadonlyAttributes = {
    readonly [k in AttributeKey]?: Readonly<Attribute<k>>
}
