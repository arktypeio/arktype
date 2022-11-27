import type { ScopeRoot } from "../scope.js"
import type { BigintAttributes } from "./types/bigint.js"
import type { BooleanAttributes } from "./types/boolean.js"
import type { DegenerateNode, Never } from "./types/degenerate.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node = TypeNode | BranchingTypeNode | DegenerateNode

export type NonBranchingNode = TypeNode | DegenerateNode

export type BranchingTypeNode = readonly TypeNode[]

export type TypeNode =
    | ({ readonly type: "object" } & ObjectAttributes)
    | ({ readonly type: "string" } & StringAttributes)
    | ({ readonly type: "number" } & NumberAttributes)
    | ({ readonly type: "bigint" } & BigintAttributes)
    | ({ readonly type: "boolean" } & BooleanAttributes)
    | { readonly type: "symbol" }
    | { readonly type: "null" }
    | { readonly type: "undefined" }

export type AttributesByType = {
    object: ObjectAttributes
    string: StringAttributes
    number: NumberAttributes
    bigint: BigintAttributes
    boolean: BooleanAttributes
}

export type TypeWithAttributes = keyof AttributesByType

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
