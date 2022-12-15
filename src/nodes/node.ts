import type { Domain } from "../utils/classify.js"
import type {
    autocompleteString,
    Dictionary,
    stringKeyOf
} from "../utils/generics.js"
import type { Keyword } from "./keywords.js"
import type { Predicate } from "./predicate.js"

export type TypeNode<scope extends Dictionary = Dictionary> =
    | Identifier<scope>
    | DomainNode<scope>

export type TypeOperand = Identifier | DomainOperand

export type Identifier<scope extends Dictionary = Dictionary> =
    Dictionary extends scope
        ? autocompleteString<Keyword>
        : Keyword | stringKeyOf<scope>

export type DomainNode<scope extends Dictionary = Dictionary> = {
    readonly [domain in Domain]?: Predicate<domain, scope>
}

export type DomainOperand = { [k in keyof DomainNode]: Predicate }
