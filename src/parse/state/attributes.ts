import type { dictionary, DynamicTypeName } from "../../utils/dynamicTypes.js"
import type { keyOrKeySet, keySet, subtype } from "../../utils/generics.js"
import type { NumberLiteral } from "../../utils/numericLiterals.js"
import type { RegexLiteral } from "../operand/enclosed.js"
import type { SerializedBounds } from "../operator/bounds/shared.js"
import type { SerializedPrimitive } from "./value.js"

type DisjointAttributeTypes = {
    value: SerializedPrimitive
    type: DynamicTypeName
}

export type DisjointKey = keyof DisjointAttributeTypes

export const disjointKeys: Record<DisjointKey, true> = {
    type: true,
    value: true
}

type AdditiveAttributeTypes = {
    divisor: NumberLiteral
    bounds: SerializedBounds
}

type ReducibleAttributeTypes = subtype<
    dictionary<string>,
    DisjointAttributeTypes & AdditiveAttributeTypes
>

type IrreducibleAttributeTypes = subtype<
    dictionary<keyOrKeySet<string>>,
    {
        regex: keyOrKeySet<RegexLiteral>
        requiredKeys: keySet<string>
        alias: keyOrKeySet<string>
        contradiction: keyOrKeySet<string>
    }
>

type ComposedAttributeTypes = {
    props: dictionary<Attributes>
    branches: AttributeBranches
}

export type AttributeBranches =
    | DiscriminatedBranches
    | UndiscriminatedBranches
    | IntersectedBranches

export type DiscriminatedBranches<key extends DisjointKey = DisjointKey> = [
    kind: "?",
    path: string,
    key: key,
    cases: AttributeCases<key>
]

export type UndiscriminatedBranches = ["|", ...Attributes[]]

export type IntersectedBranches = ["&", ...Attributes[]]

export type AttributeCases<key extends DisjointKey> = {
    [k in DisjointAttributeTypes[key] | "unset"]?: Attributes
}

export type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attributes = { [k in AttributeKey]?: AttributeTypes[k] }
