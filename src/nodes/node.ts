import type { autocompleteString, stringKeyOf } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type { BigintAttributes } from "./types/bigint.js"
import type { BooleanAttributes } from "./types/boolean.js"
import type { DegenerateTypeName } from "./types/degenerate.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node = DegenerateNode | TypedNode

export type DegenerateNode = autocompleteString<DegenerateTypeName>

export type TypedNode<scope extends dict = {}> = {
    readonly [typeName in TypeName]?: typeName extends "boolean"
        ? true | BooleanAttributes
        : typeName extends ExtendableTypeName
        ?
              | true
              | stringKeyOf<scope>
              | AttributesByType[typeName]
              | BranchesOfType<typeName>
        : true
}

export type AttributesByType = {
    object: ObjectAttributes
    string: StringAttributes
    number: NumberAttributes
    bigint: BigintAttributes
    boolean: BooleanAttributes
}

export type ExtendableTypeName = keyof AttributesByType

export type BranchesOfType<typeName extends ExtendableTypeName> = readonly (
    | string
    | AttributesByType[typeName]
)[]
