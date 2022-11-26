import type { ScopeRoot } from "../scope.js"
import type { array, DataTypeName, record } from "../utils/dataTypes.js"
import { hasDataType, hasObjectSubtype } from "../utils/dataTypes.js"
import { isEmpty } from "../utils/deepEquals.js"
import { throwInternalError } from "../utils/errors.js"
import type { evaluate, mutable, xor } from "../utils/generics.js"
import { hasKey } from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import { degenerateOperation } from "./degenerate.js"
import type { NumberAttributes } from "./number.js"
import { checkNumber, numberAttributes } from "./number.js"
import type { ObjectAttributes } from "./object.js"
import { disjointPrimitiveOperations } from "./primitives.js"
import type { DataTypeOperations } from "./shared.js"
import type { StringAttributes } from "./string.js"
import { checkString, stringAttributes } from "./string.js"

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

type UnknownTypeAttributes = true | array<string | number | boolean> | record

type UnknownType = { [k in DataTypeName]?: UnknownTypeAttributes }

export const intersectCases = (
    l: NodeTypes,
    r: NodeTypes,
    scope: ScopeRoot
): Node => {
    const result: UnknownType = {}
    const pruned: mutable<record<Never>> = {}
    let typeName: DataTypeName
    for (typeName in l) {
        if (hasKey(r, typeName)) {
            const keyResult = intersectTypeCase(
                typeName,
                l[typeName]!,
                r[typeName],
                scope
            )
            if (isNever(keyResult)) {
                pruned[typeName] = keyResult
            } else {
                result[typeName] = keyResult
            }
        }
    }
    return isEmpty(result)
        ? { degenerate: "never", reason: JSON.stringify(pruned, null, 4) }
        : (result as Node)
}

export const subtract = (l: Node, r: Node, scope: ScopeRoot) => {
    if (l.degenerate || r.degenerate) {
        return degenerateOperation("-", l, r, scope)
    }
    return l
}

export const intersectTypeCase = (
    typeName: DataTypeName,
    l: UnknownTypeAttributes,
    r: UnknownTypeAttributes,
    scope: ScopeRoot
): UnknownTypeAttributes | Never => {
    if (l === true) {
        return r
    } else if (r === true) {
        return l
    } else if (Array.isArray(l)) {
        if (Array.isArray(r)) {
            return disjointPrimitiveOperations.intersect(l, r)
        } else {
            return filterPrimitivesByAttributes(typeName, l, r)
        }
    } else if (Array.isArray(r)) {
        return filterPrimitivesByAttributes(typeName, r, l)
    }
    return intersectAttributes(typeName, l as record, r as record, scope)
}

const filterPrimitivesByAttributes = (
    typeName: DataTypeName,
    values: array<any>,
    attributes: any
) =>
    typeName === "string"
        ? values.filter((value) => checkString(attributes, value))
        : typeName === "number"
        ? values.filter((value) => checkNumber(attributes, value))
        : throwInternalError(`Unexpected primitive literal type ${typeName}`)

const attributeOperationsByType = {
    string: stringAttributes,
    number: numberAttributes,
    object: {} as any
} as any as record<DataTypeOperations<any>>

const intersectAttributes = (
    typeName: DataTypeName,
    leftAttributes: record<any>,
    rightAttributes: record<any>,
    scope: ScopeRoot
): record | Never => {
    const result = { ...leftAttributes, ...rightAttributes }
    for (const k in result) {
        if (k in leftAttributes && k in rightAttributes) {
            const intersection = attributeOperationsByType[typeName][
                k
            ].intersect(leftAttributes[k], rightAttributes[k], scope)
            if (isNever(intersection)) {
                return intersection
            }
            result[k] = intersection
        }
    }
    return result
}
