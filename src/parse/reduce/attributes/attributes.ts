import type { ScopeRoot } from "../../../scope.js"
import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type {
    defined,
    keyOrSet,
    RegexLiteral,
    subtype
} from "../../../utils/generics.js"
import type { SerializedPrimitive } from "../../../utils/primitiveSerialization.js"
import type { Bounds } from "./bounds.js"
import type { Contradiction } from "./contradiction.js"

export type AttributeKey = keyof Attributes

export type Attribute<k extends AttributeKey> = defined<Attributes[k]>

export type MutableAttributes = {
    type?: DynamicTypeName
    value?: SerializedPrimitive
    divisor?: number
    bounds?: Bounds
    required?: true
    regex?: keyOrSet<RegexLiteral>
    alias?: string
    contradiction?: keyOrSet<string>
    props?: { readonly [k in string]: Attributes }
    branches?: AttributeBranches
}

export type Attributes = Readonly<MutableAttributes>

export type DisjointKey = subtype<AttributeKey, "type" | "value">

export type CaseKey<k extends DisjointKey = DisjointKey> =
    | "default"
    | (k extends "value" ? SerializedPrimitive : DynamicTypeName)

export type AttributeBranches = UnionBranches | IntersectedBranches

export type UnionBranches = UndiscriminatedBranches | DiscriminatedBranches

export type UndiscriminatedBranches = readonly [
    token: "|",
    members: Attributes[]
]

export type IntersectedBranches = readonly [
    token: "&",
    members: UnionBranches[]
]

export type DiscriminatedBranches<k extends DisjointKey = DisjointKey> =
    readonly [token: "?", path: AttributePath<k>, cases: AttributeCases<k>]

export type AttributePath<k extends AttributeKey = AttributeKey> =
    | k
    | `${string}.${k}`

type AttributeCases<k extends DisjointKey = DisjointKey> = {
    readonly [_ in CaseKey<k>]?: Attributes
}

export type AttributeOperations<t> = {
    intersect: AttributeIntersection<t>
    extract: SetOperation<t>
    exclude: SetOperation<t>
}

export const defineOperations =
    <t>() =>
    <operations extends AttributeOperations<t>>(operations: operations) =>
        operations

export type AttributeIntersection<t> = (
    a: t,
    b: t,
    scope: ScopeRoot
) => t | Contradiction

export type SetOperation<t> = (a: t, b: t) => t | null
