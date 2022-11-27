import type { ScopeRoot } from "../../scope.js"
import type { DataTypes, record } from "../../utils/dataTypes.js"
import type { AttributesByType, TypeWithAttributes } from "../node.js"
import type { Never } from "./degenerate.js"
import { numberOperations } from "./number.js"

export type TypeOperations<data, attributes extends record> = {
    intersect: IntersectFn<attributes>
    prune: PruneFn<attributes>
    check: CheckFn<data, attributes>
}

export type IntersectFn<t> = (l: t, r: t, scope: ScopeRoot) => t | Never

export type PruneFn<t> = (
    branch: t,
    given: t,
    scope: ScopeRoot
) => t | undefined

export type CheckFn<data, attributes> = (
    data: data,
    attributes: attributes,
    scope: ScopeRoot
) => boolean

type OperationsByType = {
    [typeName in TypeWithAttributes]: TypeOperations<
        DataTypes[typeName],
        AttributesByType[typeName]
    >
}

export const operations = {
    number: numberOperations
} satisfies OperationsByType
