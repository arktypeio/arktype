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
import type { mutable, xor } from "../utils/generics.js"
import { evaluate, hasKey, isKeyOf } from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import { degenerateOperation } from "./degenerate.js"
import type { NumberAttributes } from "./number.js"
import { checkNumber, numberAttributes } from "./number.js"
import type { ObjectAttributes } from "./object.js"
import { disjointPrimitiveOperations } from "./primitives.js"
import type { StringAttributes } from "./string.js"
import { checkString, stringAttributes } from "./string.js"

export type Node = TypeCases | DegenerateNode

const isDegenerate = (node: Node): node is DegenerateNode =>
    !Array.isArray(node)

export type TypeCases = readonly TypeCase[]

export type DegenerateNode = Never | Any | Unknown | Alias

export type TypeCase =
    | { readonly type: "bigint"; readonly values?: readonly IntegerLiteral[] }
    | { readonly type: "boolean"; readonly values?: readonly [boolean] }
    | { readonly type: "null" }
    | ({ readonly type: "number" } & xor<
          { readonly values?: readonly number[] },
          { readonly attributes?: NumberAttributes }
      >)
    | { readonly type: "object"; readonly attributes?: ObjectAttributes }
    | ({ readonly type: "string" } & xor<
          { readonly values?: readonly string[] },
          { readonly attributes?: StringAttributes }
      >)
    | { readonly type: "symbol" }
    | { readonly type: "undefined" }

export type Never = { readonly type: "never"; readonly reason: string }

export type Any = { readonly type: "any" }

export type Unknown = { readonly type: "unknown" }

export type Alias = { readonly type: "alias"; readonly name: string }

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
    isDegenerate(l) || isDegenerate(r)
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
        ? { type: "never", reason: JSON.stringify(pruned, null, 4) }
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
