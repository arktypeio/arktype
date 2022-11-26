import type { ScopeRoot } from "../scope.js"
import type {
    array,
    DataTypeName,
    DataTypes,
    record
} from "../utils/dataTypes.js"
import { isEmpty } from "../utils/deepEquals.js"
import { throwInternalError } from "../utils/errors.js"
import { hasKey, isKeyOf, mutable, xor } from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { DegenerateNode } from "./degenerate.js"
import { degenerateOperation } from "./degenerate.js"
import type { NumberAttributes } from "./number.js"
import { checkNumber } from "./number.js"
import type { ObjectAttributes } from "./object.js"
import type { StringAttributes } from "./string.js"
import { checkString } from "./string.js"

export type Node = TypeBranches | DegenerateNode

export type TypeBranches = readonly TypeBranch[]

export type TypeBranch =
    | ({ readonly type: "object" } & ObjectAttributes)
    | ({ readonly type: "string" } & StringAttributes)
    | ({ readonly type: "number" } & NumberAttributes)
    | { readonly type: "bigint"; readonly values?: readonly IntegerLiteral[] }
    | { readonly type: "boolean"; readonly value?: boolean }
    | { readonly type: "symbol" }
    | { readonly type: "null" }
    | { readonly type: "undefined" }

export type NodeOperator = "&" | "-"

// export const intersect = (l: Node, r: Node, scope: ScopeRoot) =>
//     isDegenerate(l) || isDegenerate(r)
//         ? degenerateOperation("&", l, r, scope)
//         : intersectCases(l, r, scope)

// type UnknownTypeCase = true | UnknownPrimitives | UnknownAttributes

// type UnknownPrimitives = readonly (string | number | boolean)[]

// type UnknownAttributes = AttributesByDataType[DataTypeWithAttributes]

// type UnknownType = { [k in DataTypeName]?: UnknownTypeCase }

// export const intersectCases = (
//     l: TypeBranches,
//     r: TypeBranches,
//     scope: ScopeRoot
// ): Node => {
//     const result: UnknownType = {}
//     const pruned: mutable<record<Never>> = {}
//     let typeName: DataTypeName
//     for (typeName in l) {
//         if (hasKey(r, typeName)) {
//             const keyResult = intersectTypeCase(
//                 typeName,
//                 l[typeName]!,
//                 r[typeName],
//                 scope
//             )
//             if (isNever(keyResult)) {
//                 pruned[typeName] = keyResult
//             } else {
//                 result[typeName] = keyResult
//             }
//         }
//     }
//     return isEmpty(result)
//         ? { type: "never", reason: JSON.stringify(pruned, null, 4) }
//         : (result as Node)
// }

// export const subtract = (l: Node, r: Node, scope: ScopeRoot) => {
//     if (l.degenerate || r.degenerate) {
//         return degenerateOperation("-", l, r, scope)
//     }
//     return l
// }

// const isPrimitiveSet = (typeCase: unknown): typeCase is any[] =>
//     Array.isArray(typeCase)

// export const intersectTypeCase = <typeName extends DataTypeName>(
//     typeName: typeName,
//     l: TypeBranches[typeName],
//     r: TypeBranches[typeName],
//     scope: ScopeRoot
// ): TypeBranches[typeName] | Never => {
//     if (l === true) {
//         return r
//     } else if (r === true) {
//         return l
//     } else if (isPrimitiveSet(l)) {
//         if (isPrimitiveSet(r)) {
//             return disjointPrimitiveOperations.intersect(
//                 l,
//                 r
//             ) as TypeBranches[typeName]
//         }
//         return filterPrimitivesByAttributes(
//             typeName as PrimitiveDataTypeWithAttributes,
//             l,
//             r as record
//         ) as any
//     }
//     if (isPrimitiveSet(r)) {
//         return filterPrimitivesByAttributes(
//             typeName as PrimitiveDataTypeWithAttributes,
//             r,
//             l as record
//         ) as any
//     }
//     return intersectAttributes(
//         typeName as DataTypeWithAttributes,
//         l as record,
//         r as record,
//         scope
//     ) as any
// }

// type AttributesByDataType = {
//     number: NumberAttributes
//     object: ObjectAttributes
//     string: StringAttributes
// }

// type DataTypeWithAttributes = keyof AttributesByDataType

// type PrimitiveDataTypeWithAttributes = keyof AttributesByDataType

// const filterPrimitivesByAttributes = <
//     typeName extends PrimitiveDataTypeWithAttributes
// >(
//     typeName: typeName,
//     values: array<DataTypes[typeName]>,
//     attributes: AttributesByDataType[typeName]
// ) =>
//     typeName === "string"
//         ? values.filter((value) =>
//               checkString(attributes as StringAttributes, value as string)
//           )
//         : typeName === "number"
//         ? values.filter((value) =>
//               checkNumber(attributes as NumberAttributes, value as number)
//           )
//         : throwInternalError(`Unexpected primitive literal type ${typeName}`)

// const attributeOperationsByType = {
//     string: stringAttributes,
//     number: numberAttributes,
//     object: {} as any
// }

// const intersectAttributes = <typeName extends DataTypeWithAttributes>(
//     typeName: typeName,
//     leftAttributes: AttributesByDataType[typeName],
//     rightAttributes: AttributesByDataType[typeName],
//     scope: ScopeRoot
// ): AttributesByDataType[typeName] | Never => {
//     const result = { ...leftAttributes, ...rightAttributes }
//     for (const k in result) {
//         if (k in leftAttributes && k in rightAttributes) {
//             const intersection = attributeOperationsByType[typeName][
//                 k
//             ].intersect(leftAttributes[k], rightAttributes[k], scope)
//             if (isNever(intersection)) {
//                 return intersection
//             }
//             result[k] = intersection
//         }
//     }
//     return result
// }
