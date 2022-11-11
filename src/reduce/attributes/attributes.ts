import type {
    dictionary,
    DynamicTypeName
} from "../../../utils/dynamicTypes.js"
import type { keyOrSet, keySet, subtype } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import type { SerializedPrimitive } from "../../../utils/primitiveSerialization.js"
import type { RegexLiteral } from "../../operand/enclosed.js"
import type { DiscriminatedBranches } from "../../operator/union/discriminate.js"
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
