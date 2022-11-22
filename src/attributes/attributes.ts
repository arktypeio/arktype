import type { ScopeRoot } from "../scope.js"
import type { DynamicTypeName } from "../utils/dynamicTypes.js"
import type {
    defined,
    evaluate,
    keySet,
    RegexLiteral
} from "../utils/generics.js"
import type { SerializedPrimitive } from "../utils/primitiveSerialization.js"
import type { Bounds } from "./bounds.js"

export type Type = {
    [typeCase in TypeCase]?: AttributesOf<typeCase>
}

type TypeCase = DynamicTypeName | SerializedPrimitive

type AllAttributes = BaseAttributes & ConditionalAttributes

export type AttributeKey = keyof AllAttributes

export type Attribute<k extends AttributeKey> = defined<AllAttributes[k]>

type BaseAttributes = {
    readonly required?: true
    readonly alias?: string
    readonly branches?: Branches
}

type ConditionalAttributes = {
    readonly divisor?: number
    readonly bounds?: Bounds
    readonly regex?: keySet<RegexLiteral>
    readonly props?: { readonly [k in string]: Type }
}

type ConditionalAttributesByTypeCase = {
    number: evaluate<Pick<ConditionalAttributes, "divisor" | "bounds">>
    string: Pick<ConditionalAttributes, "regex" | "bounds">
    array: Pick<ConditionalAttributes, "props" | "bounds">
    dictionary: Pick<ConditionalAttributes, "props">
}

type AttributesOf<typeCase extends TypeCase> = BaseAttributes &
    (typeCase extends keyof ConditionalAttributesByTypeCase
        ? ConditionalAttributesByTypeCase[typeCase]
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
    readonly [typeCase in TypeCase]?: Type
}

export type AttributeOperations<t> = {
    intersection: (a: t, b: t, scope: ScopeRoot) => t | null
    difference: (a: t, b: t, scope: ScopeRoot) => t | undefined
}

export const defineOperations =
    <t>() =>
    <operations extends AttributeOperations<t>>(operations: operations) =>
        operations
