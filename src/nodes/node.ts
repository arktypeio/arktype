import type { ScopeRoot } from "../scope.js"
import type { DataTypeName, record } from "../utils/dataTypes.js"
import { hasDataType, hasObjectSubtype } from "../utils/dataTypes.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { defined, evaluate, xor } from "../utils/generics.js"
import { hasKey } from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import { degenerateOperation } from "./degenerate.js"
import type { NumberAttributes } from "./number.js"
import type { ObjectAttributes } from "./object.js"
import type { DataTypeOperations } from "./shared.js"
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

type UnknownTypeAttributes = true | (string | number | boolean)[] | record

type UnknownType = { [k in DataTypeName]?: UnknownTypeAttributes }

export const intersectCases = (
    l: NodeTypes,
    r: NodeTypes,
    scope: ScopeRoot
): Node => {
    const result: UnknownType = {}
    let typeName: DataTypeName
    for (typeName in l) {
        if (hasKey(r, typeName)) {
            const leftCase = l[typeName] as UnknownTypeAttributes
            const rightCase = l[typeName] as UnknownTypeAttributes
            if (leftCase === true) {
                result[typeName] = rightCase
            } else if (rightCase === true) {
                result[typeName] = leftCase
            } else if (Array.isArray(leftCase)) {
                if (Array.isArray(rightCase)) {
                    const overlappingValues = leftCase.filter(
                        (primitiveValue) => rightCase.includes(primitiveValue)
                    )
                    if (overlappingValues.length) {
                        result[typeName] = overlappingValues
                    }
                } else {
                }
            }
            result[typeName] = l[typeName] as any
        }
    }
    return isEmpty(result)
        ? { degenerate: "never", reason: "" }
        : (result as Node)
}

export const subtract = (l: Node, r: Node, scope: ScopeRoot) => {
    if (l.degenerate || r.degenerate) {
        return degenerateOperation("-", l, r, scope)
    }
    return l
}

export const intersectAttributes = <
    attributes extends record,
    mapper extends DataTypeOperations<attributes>
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

const subtractAttributes = <
    attributes extends record,
    mapper extends DataTypeDifference<attributes>
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
