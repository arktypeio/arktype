import type { ScopeRoot } from "../scope.js"
import type { DataTypeName, record } from "../utils/dataTypes.js"
import { hasDataType, hasObjectSubtype } from "../utils/dataTypes.js"
import type { defined, evaluate, mutable, xor } from "../utils/generics.js"
import { hasKey } from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import { degenerateOperation } from "./degenerate.js"
import type { NumberAttributes } from "./number.js"
import type { ObjectAttributes } from "./object.js"
import type { StringAttributes } from "./string.js"

export type Node = xor<NodeTypes, DegenerateNode>

export type NodeTypes = {
    readonly bigint?: true | readonly IntegerLiteral[]
    readonly boolean?: true | readonly [boolean]
    readonly number?: true | readonly number[] | NumberAttributes
    readonly object?: true | ObjectAttributes
    readonly string?: true | readonly string[] | StringAttributes
    readonly symbol?: true
    readonly undefined?: true
    readonly null?: true
}

export type TypeName = evaluate<keyof NodeTypes>

export type DegenerateNode = Never | Any | Unknown | Alias

export type Never = { degenerate: "never"; reason: string }

export const isNever = (t: unknown): t is Never =>
    hasDataType(t, "object") &&
    hasObjectSubtype(t, "record") &&
    t.degenerate === "never"

export type Any = { degenerate: "any" }

export type Unknown = { degenerate: "unknown" }

export type Alias = { degenerate: "alias"; name: string }

export type Branches = UnionBranches | IntersectedUnions

export type UnionBranches = UndiscriminatedUnion | DiscriminatedUnion

export type UndiscriminatedUnion = readonly [token: "|", members: Node[]]

export type IntersectedUnions = readonly [token: "&", members: UnionBranches[]]

export type DiscriminatedUnion = readonly [
    token: "?",
    path: string,
    cases: DiscriminatedCases
]

type DiscriminatedCases = {
    readonly [k in DataTypeName]?: Node
}

export type NodeOperator = "&" | "-"

export const intersect = (l: Node, r: Node, scope: ScopeRoot) =>
    l.degenerate || r.degenerate
        ? degenerateOperation("&", l, r, scope)
        : intersectCases(l, r, scope)

export const intersectCases = (
    l: NodeTypes,
    r: NodeTypes,
    scope: ScopeRoot
) => {
    const result: mutable<NodeTypes> = {}
    let caseKey: DataTypeName
    for (caseKey in l) {
        if (hasKey(r, caseKey)) {
            result[caseKey] = l[caseKey] as any
        }
    }
    return result
}

export const subtract = (l: Node, r: Node, scope: ScopeRoot) => {
    if (l.degenerate || r.degenerate) {
        return degenerateOperation("-", l, r, scope)
    }
    return l
}

export type AttributeIntersection<t> = (
    l: t,
    r: t,
    scope: ScopeRoot
) => t | Never

export type AttributeIntersectionMapper<attributes extends record> = {
    [k in keyof attributes]-?: AttributeIntersection<defined<attributes[k]>>
}

export const intersectAttributes = <
    attributes extends record,
    mapper extends AttributeIntersectionMapper<attributes>
>(
    l: attributes,
    r: attributes,
    mapper: mapper,
    scope: ScopeRoot
) => {
    const result = { ...l, ...r }
    for (const k in result) {
        if (hasKey(l, k) && hasKey(r, k)) {
            const attributeResult = (mapper[k] as DynamicOperation)(
                l[k],
                r[k],
                scope
            )
            if (isNever(attributeResult)) {
                return attributeResult
            }
            result[k] = attributeResult as any
        }
    }
    return result
}

export type AttributeDifferenceMapper<attributes extends record> = {
    [k in keyof attributes]-?: AttributeDifference<defined<attributes[k]>>
}

export type AttributeDifference<t> = (l: t, r: t, scope: ScopeRoot) => t | null

const subtractAttributes = <
    attributes extends record,
    mapper extends AttributeDifferenceMapper<attributes>
>(
    l: attributes,
    r: attributes,
    mapper: mapper,
    scope: ScopeRoot
) => {
    const result = {} as attributes
    for (const k in l) {
        if (hasKey(r, k)) {
            const attributeResult = (mapper[k] as DynamicOperation)(
                l[k],
                r[k],
                scope
            )
            if (attributeResult !== null) {
                result[k] = attributeResult as any
            }
        } else {
            result[k] = l[k]
        }
    }
    return result
}

type DynamicOperation = (l: unknown, r: unknown, scope: ScopeRoot) => any
