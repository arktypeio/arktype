import type {
    dictionary,
    DynamicTypeName
} from "../../../utils/dynamicTypes.js"
import type { keyOrSet, keySet, subtype } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import type { RegexLiteral } from "../../operand/enclosed.js"
import type { DiscriminatedBranches } from "../../operator/union/discriminate.js"
import { keyOrSetDifference, keyOrSetIntersection } from "./keySets.js"
import type {
    DeserializedAttribute,
    SerializedBounds
} from "./serialization.js"
import type { SerializablePrimitive, SerializedPrimitive } from "./value.js"

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
        contradiction: keyOrSet<string>
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

type IsolatableKey = Exclude<AttributeKey, "branches">

type KeyWithDisjoinableIntersection = keyof DisjointAttributeTypes | "bounds"

export type AttributeIntersection<k extends IsolatableKey> = IntersectionOf<
    DeserializedAttribute<k>,
    k extends KeyWithDisjoinableIntersection ? null : never
>

export type IntersectionOf<t, additionalResultTypes = never> = (
    a: t,
    b: t
) => t | additionalResultTypes

export type AttributeDifference<k extends IsolatableKey> = DifferenceOf<
    DeserializedAttribute<k>
>

export type DifferenceOf<t> = (a: t, b: t) => t | null

type AttributeIntersections = {
    [k in IsolatableKey]?: AttributeIntersection<k>
}

type AttributeDifferences = {
    [k in IsolatableKey]?: AttributeDifference<k>
}

const disjointIntersection = <t>(a: t, b: t) => (a === b ? a : null)

export const intersections: AttributeIntersections = {
    type: disjointIntersection<DynamicTypeName>,
    value: disjointIntersection<SerializablePrimitive>,
    alias: keyOrSetIntersection,
    contradiction: keyOrSetIntersection,
    regex: keyOrSetIntersection as IntersectionOf<keyOrSet<RegexLiteral>>
}

const disjointDifference = <t>(a: t, b: t) => (a === b ? null : a)

export const differences: AttributeDifferences = {
    type: disjointDifference<DynamicTypeName>,
    value: disjointDifference<SerializablePrimitive>,
    alias: keyOrSetDifference,
    contradiction: keyOrSetDifference,
    regex: keyOrSetDifference as DifferenceOf<keyOrSet<RegexLiteral>>
}
