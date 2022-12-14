import type { Domain } from "../utils/classify.js"
import type {
    autocompleteString,
    Dictionary,
    stringKeyOf
} from "../utils/generics.js"
import type { Keyword } from "./keywords.js"
import type { Predicate } from "./predicate.js"

export type TypeRoot<scope extends Dictionary = Dictionary> =
    | IdentifierNode<scope>
    | TypeSet<scope>

export type TypeNode = IdentifierNode | RawTypeSet

export type IdentifierNode<scope extends Dictionary = Dictionary> =
    Dictionary extends scope
        ? autocompleteString<Keyword>
        : Keyword | stringKeyOf<scope>

export type TypeSet<scope extends Dictionary = Dictionary> = {
    readonly [domain in Domain]?: Predicate<domain, scope>
}

export type RawTypeSet = { [k in keyof TypeSet]: Predicate }
