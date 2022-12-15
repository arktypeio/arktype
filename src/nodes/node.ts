import type { Domain } from "../utils/classify.js"
import type { Dictionary, stringKeyOf } from "../utils/generics.js"
import type { Keyword } from "./keywords.js"
import type { Predicate } from "./predicate.js"

export type TypeNode<scope extends Dictionary = Dictionary> =
    | Identifier<scope>
    | TypeSet<scope>

export type TypeSet<scope extends Dictionary = Dictionary> = {
    readonly [domain in Domain]?: Dictionary extends scope
        ? Predicate
        : Predicate<domain, scope>
}

export type Identifier<scope extends Dictionary = Dictionary> =
    | Keyword
    | stringKeyOf<scope>
