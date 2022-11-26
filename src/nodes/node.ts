import type { ScopeRoot } from "../scope.js"
import type {
    array,
    DataTypeName,
    DataTypes,
    record
} from "../utils/dataTypes.js"
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
import type { StringAttributes } from "./string.js"
import { checkString, stringAttributes } from "./string.js"

export type Node = xor<TypeCases, DegenerateNode>

export type TypeCases = {
    readonly bigint?: true | readonly IntegerLiteral[]
    readonly boolean?: true | readonly [boolean]
    readonly number?: true | readonly number[] | NumberAttributes
    readonly object?: true | ObjectAttributes
    readonly string?: true | readonly string[] | StringAttributes
    readonly symbol?: true
    readonly undefined?: true
    readonly null?: true
}

export type TypeName = evaluate<keyof TypeCases>

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

type UnknownTypeCase = true | UnknownPrimitives | UnknownAttributes

type UnknownPrimitives = readonly (string | number | boolean)[]

type UnknownAttributes = AttributesByDataType[DataTypeWithAttributes]

type UnknownType = { [k in DataTypeName]?: UnknownTypeCase }

export const intersectCases = (
    l: TypeCases,
    r: TypeCases,
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

const isPrimitiveSet = (typeCase: unknown): typeCase is any[] =>
    Array.isArray(typeCase)

export const intersectTypeCase = <typeName extends DataTypeName>(
    typeName: typeName,
    l: TypeCases[typeName],
    r: TypeCases[typeName],
    scope: ScopeRoot
): TypeCases[typeName] | Never => {
    if (l === true) {
        return r
    } else if (r === true) {
        return l
    } else if (isPrimitiveSet(l)) {
        if (isPrimitiveSet(r)) {
            return disjointPrimitiveOperations.intersect(
                l,
                r
            ) as TypeCases[typeName]
        }
        return filterPrimitivesByAttributes(
            typeName as PrimitiveDataTypeWithAttributes,
            l,
            r as record
        ) as any
    }
    if (isPrimitiveSet(r)) {
        return filterPrimitivesByAttributes(
            typeName as PrimitiveDataTypeWithAttributes,
            r,
            l as record
        ) as any
    }
    return intersectAttributes(
        typeName as DataTypeWithAttributes,
        l as record,
        r as record,
        scope
    ) as any
}

type AttributesByDataType = {
    number: NumberAttributes
    object: ObjectAttributes
    string: StringAttributes
}

type DataTypeWithAttributes = keyof AttributesByDataType

type PrimitiveDataTypeWithAttributes = keyof AttributesByDataType

const filterPrimitivesByAttributes = <
    typeName extends PrimitiveDataTypeWithAttributes
>(
    typeName: typeName,
    values: array<DataTypes[typeName]>,
    attributes: AttributesByDataType[typeName]
) =>
    typeName === "string"
        ? values.filter((value) =>
              checkString(attributes as StringAttributes, value as string)
          )
        : typeName === "number"
        ? values.filter((value) =>
              checkNumber(attributes as NumberAttributes, value as number)
          )
        : throwInternalError(`Unexpected primitive literal type ${typeName}`)

const attributeOperationsByType = {
    string: stringAttributes,
    number: numberAttributes,
    object: {} as any
}

const intersectAttributes = <typeName extends DataTypeWithAttributes>(
    typeName: typeName,
    leftAttributes: AttributesByDataType[typeName],
    rightAttributes: AttributesByDataType[typeName],
    scope: ScopeRoot
): AttributesByDataType[typeName] | Never => {
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
