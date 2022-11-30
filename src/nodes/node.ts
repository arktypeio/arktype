import { deepFreeze } from "../utils/freeze.js"
import type { autocompleteString, stringKeyOf } from "../utils/generics.js"
import { TypeName } from "../utils/typeOf.js"
import type { dict } from "../utils/typeOf.js"
import type { BigintAttributes } from "./types/bigint.js"
import type { BooleanAttributes } from "./types/boolean.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node<scope extends dict = {}> =
    | ReferenceNode<scope>
    | AttributesNode<scope>

export const degenerateReferences = deepFreeze({
    never: true,
    unknown: true,
    any: true
})

export type DegenerateReference = keyof typeof degenerateReferences

export const typeNameReferences = deepFreeze({
    bigint: true,
    boolean: true,
    null: true,
    number: true,
    object: true,
    string: true,
    symbol: true,
    undefined: true
} satisfies Record<TypeName, true>)

export type BuiltinReference = TypeName | DegenerateReference

export type ReferenceNode<scope extends dict = {}> =
    string extends stringKeyOf<scope>
        ? autocompleteString<BuiltinReference>
        : BuiltinReference | stringKeyOf<scope>

// TODO: Pass scope so can validate alias types?
export type AttributesNode<scope extends dict = {}> = {
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
