import type { ScopeRoot } from "../scope.js"
import type {
    DynamicTypeName,
    dynamicTypeOf,
    DynamicTypes
} from "../utils/dynamicTypes.js"
import type {
    defined,
    evaluate,
    keySet,
    RegexLiteral,
    subtype,
    xor
} from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import { SerializablePrimitive } from "../utils/primitiveSerialization.js"
import type { Bounds } from "./bounds.js"

export type Type = xor<AssociativeType, DegenerateType>

export type AssociativeType = subtype<
    Record<DynamicTypeName, unknown>,
    {
        array: {}
    }
>

export type DegenerateType = Never | Any | Unknown | Alias

export type Never = { degenerate: "never"; reason: string }

export type Any = { degenerate: "any" }

export type Unknown = { degenerate: "unknown" }

export type Alias = { degenerate: "alias"; name: string }

export type UnknownAttributes = BaseAttributes & ConditionalAttributes

export type AttributeKey = keyof UnknownAttributes

export type Attribute<k extends AttributeKey> = defined<UnknownAttributes[k]>

type BaseAttributes = {
    readonly branches?: Branches
}

type ConditionalAttributes = {
    readonly divisor?: number
    readonly bounds?: Bounds
    readonly regex?: keySet<RegexLiteral>
    readonly props?: { readonly [k in string]: Type }
    readonly requiredKeys?: keySet
}

type ConditionalAttributesByTypeCase = {
    number: evaluate<Pick<ConditionalAttributes, "divisor" | "bounds">>
    string: Pick<ConditionalAttributes, "regex" | "bounds">
    array: Pick<ConditionalAttributes, "props" | "bounds">
    dictionary: Pick<ConditionalAttributes, "props" | "requiredKeys">
}

type NarrowableTypeName = subtype<
    DynamicTypeName,
    "number" | "string" | "boolean" | "bigint"
>

export type AttributesOf<name extends DynamicTypeName> = BaseAttributes &
    (name extends keyof ConditionalAttributesByTypeCase
        ? ConditionalAttributesByTypeCase[name]
        : {}) &
    (name extends NarrowableTypeName
        ? {
              value?: name extends "bigint"
                  ? IntegerLiteral
                  : DynamicTypes[name]
          }
        : {})

export type Branches = UnionBranches | IntersectedUnions

export type UnionBranches = UndiscriminatedUnion | DiscriminatedUnion

export type UndiscriminatedUnion = readonly [token: "|", members: Type[]]

export type IntersectedUnions = readonly [token: "&", members: UnionBranches[]]

export type DiscriminatedUnion = readonly [
    token: "?",
    path: string,
    cases: DiscriminatedCases
]

type DiscriminatedCases = {
    readonly [k in DynamicTypeName]?: Type
}

export type AttributeOperations<t> = {
    intersection: (a: t, b: t, scope: ScopeRoot) => t | null
    difference: (a: t, b: t, scope: ScopeRoot) => t | undefined
}

export const defineOperations =
    <t>() =>
    <operations extends AttributeOperations<t>>(operations: operations) =>
        operations
