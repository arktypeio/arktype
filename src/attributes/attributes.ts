import type { ScopeRoot } from "../scope.js"
import type { dictionary, DynamicTypeName } from "../utils/dynamicTypes.js"
import type {
    defined,
    evaluate,
    keySet,
    RegexLiteral
} from "../utils/generics.js"
import type { SerializedPrimitive } from "../utils/primitiveSerialization.js"
import type { Bounds } from "./bounds.js"

export type Type = CaselessType | Cases

export type CaselessType = Never | Always | Alias

export const hasCases = (t: UnknownType): t is UnknownCases => !Array.isArray(t)

export type Never = [type: "never", reason: string]

export type Always = [type: "always", keyword: "any" | "unknown"]

export type Alias = [type: "alias", name: string]

export type Cases = {
    [typeCase in CaseKey]?: AttributesOf<typeCase>
}

export type UnknownType = CaselessType | UnknownCases

export type UnknownCases = dictionary<UnknownAttributes>

export type CaseKey = DynamicTypeName | SerializedPrimitive

export type UnknownAttributes = BaseAttributes & ConditionalAttributes

export type AttributeKey = keyof UnknownAttributes

export type Attribute<k extends AttributeKey> = defined<UnknownAttributes[k]>

type BaseAttributes = {
    readonly required?: true
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

export type AttributesOf<typeCase extends CaseKey> = BaseAttributes &
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
    readonly [typeCase in CaseKey]?: Type
}

export type AttributeOperations<t> = {
    intersection: (a: t, b: t, scope: ScopeRoot) => t | null
    difference: (a: t, b: t, scope: ScopeRoot) => t | undefined
}

export const defineOperations =
    <t>() =>
    <operations extends AttributeOperations<t>>(operations: operations) =>
        operations
