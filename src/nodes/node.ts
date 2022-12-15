import type { Domain } from "../utils/classify.js"
import type { Dictionary, stringKeyOf } from "../utils/generics.js"
import type { Keyword } from "./keywords.js"
import type { Predicate } from "./predicate.js"

export type TypeRoot<scope extends Dictionary = Dictionary> =
    | Identifier<scope>
    | TypeSet<scope>

export type RawTypeRoot = Identifier | RawTypeSet

export type Identifier<scope extends Dictionary = Dictionary> =
    | Keyword
    | stringKeyOf<scope>

export type TypeSet<scope extends Dictionary = Dictionary> = {
    readonly [domain in Domain]?: Predicate<domain, scope>
}

export type RawTypeSet = { [k in keyof TypeSet]: Predicate }
