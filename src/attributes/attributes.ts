import type { ScopeRoot } from "../scope.js"
import type { DynamicTypeName } from "../utils/dynamicTypes.js"
import type {
    defined,
    keySet,
    RegexLiteral,
    subtype
} from "../utils/generics.js"
import type { SerializedPrimitive } from "../utils/primitiveSerialization.js"
import type { Bounds } from "./bounds.js"

export type AttributeKey = keyof Attributes

export type Attribute<k extends AttributeKey> = defined<Attributes[k]>

export type MutableAttributes = {
    type?: DynamicTypeName
    value?: SerializedPrimitive
    divisor?: number
    bounds?: Bounds
    required?: true
    regex?: keySet<RegexLiteral>
    contradiction?: keySet
    alias?: string
    props?: { readonly [k in string]: Attributes }
    branches?: Branches
}

export type Attributes = Readonly<MutableAttributes>

export type DisjointKey = subtype<AttributeKey, "type" | "value">

export type CaseKey<k extends DisjointKey = DisjointKey> =
    | "default"
    | (k extends "value" ? SerializedPrimitive : DynamicTypeName)

export type Branches = UnionBranches | IntersectedUnions

export type UnionBranches = UndiscriminatedUnion | DiscriminatedUnion

export type UndiscriminatedUnion = readonly [token: "|", members: Attributes[]]

export type IntersectedUnions = readonly [token: "&", members: UnionBranches[]]

export type DiscriminatedUnion<k extends DisjointKey = DisjointKey> = readonly [
    token: "?",
    path: AttributePath<k>,
    cases: AttributeCases<k>
]

export type AttributePath<k extends AttributeKey = AttributeKey> =
    | k
    | `${string}.${k}`

type AttributeCases<k extends DisjointKey = DisjointKey> = {
    readonly [_ in CaseKey<k>]?: Attributes
}

export type AttributeOperations<t> = {
    // What should we check to ensure a and b are both fulfilled?
    intersection: (a: t, b: t, scope: ScopeRoot) => t | null
    // Given b, what portion of a should we still check?
    union: (a: t, b: t, scope: ScopeRoot) => t | undefined
}

export const defineOperations =
    <t>() =>
    <operations extends AttributeOperations<t>>(operations: operations) =>
        operations
