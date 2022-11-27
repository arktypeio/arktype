import type { BigintAttributes } from "./types/bigint.js"
import type { BooleanAttributes } from "./types/boolean.js"
import type { DegenerateNode } from "./types/degenerate.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node = TypeNode | BranchingTypeNode | DegenerateNode

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
