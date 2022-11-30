import type { autocompleteString } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import type { BigintAttributes } from "./types/bigint.js"
import type { BooleanAttributes } from "./types/boolean.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node<alias extends string = never> =
    | autocompleteString<TypeName | "any" | "unknown" | "never" | alias>
    | TypeNode<alias>

export type TypeNode<alias extends string = never> = {
    readonly [typeName in TypeName]?: typeName extends ExtendableTypeName
        ? true | string | AttributesByType[typeName] | BranchesOfType<typeName>
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
