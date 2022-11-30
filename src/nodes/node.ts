import type { stringKeyOf } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type { BigintAttributes } from "./types/bigint.js"
import type { BooleanAttributes } from "./types/boolean.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node<scope extends dict = {}> = NameNode<scope> | TypeNode<scope>

export type DegenerateTypeName = "never" | "unknown" | "any"

export type BuiltinTypeName = TypeName | DegenerateTypeName

export type NameNode<scope extends dict = {}> =
    | BuiltinTypeName
    | stringKeyOf<scope>

// TODO: Pass scope so can validate alias types?
export type TypeNode<scope extends dict = {}> = {
    readonly [typeName in TypeName]?: typeName extends ExtendableTypeName
        ?
              | true
              | stringKeyOf<scope>
              | AttributesByType[typeName]
              | BranchesOfType<typeName>
        : typeName extends boolean
        ? true | BooleanAttributes
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
