import type { autocompleteString, stringKeyOf } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type { Keyword } from "./names.js"
import type { BigintAttributes } from "./types/bigint.js"
import type { BooleanAttributes } from "./types/boolean.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node<scope extends dict = dict> =
    | NameNode<scope>
    | ResolvedNode<scope>

export type NameNode<scope extends dict = dict> =
    string extends stringKeyOf<scope>
        ? autocompleteString<Keyword>
        : Keyword | stringKeyOf<scope>

export type ResolvedNode<scope extends dict = dict> = {
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
