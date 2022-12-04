import type { autocompleteString, stringKeyOf } from "../utils/generics.js"
import type { array, dict } from "../utils/typeOf.js"
import type { Attributes } from "./attributes/attributes.js"
import type { Keyword } from "./names.js"

export type Node<scope extends dict = dict> = NameNode<scope> | ResolutionNode

export type NameNode<scope extends dict = dict> =
    string extends stringKeyOf<scope>
        ? autocompleteString<Keyword>
        : Keyword | stringKeyOf<scope>

export type ResolutionNode<scope extends dict = dict> =
    | Attributes<scope>
    | Branches<scope>

export type Branches<scope extends dict = dict> = array<
    NameNode<scope> | Attributes<scope>
>
