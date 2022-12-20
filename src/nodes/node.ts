import type { Domain } from "../utils/domains.js"
import type { Dict, stringKeyOf } from "../utils/generics.js"
import type { Keyword } from "./keywords.js"
import type { Predicate } from "./predicate.js"

export type TypeNode<scope extends Dict = Dict> =
    | Identifier<scope>
    | TypeSet<scope>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeSet<scope extends Dict = Dict> = {
    readonly [domain in Domain]?: string extends keyof scope
        ? Predicate
        : Predicate<domain, scope>
}

export type Identifier<scope extends Dict = Dict> = Keyword | stringKeyOf<scope>
