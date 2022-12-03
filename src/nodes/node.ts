import type { autocompleteString, stringKeyOf } from "../utils/generics.js"
import type { array, dict } from "../utils/typeOf.js"
import type { AttributesNode } from "./attributes.js"
import type { Keyword } from "./names.js"

export type Node<scope extends dict = dict> = NameNode<scope> | ResolutionNode

export type NameNode<scope extends dict = dict> =
    string extends stringKeyOf<scope>
        ? autocompleteString<Keyword>
        : Keyword | stringKeyOf<scope>

export type ResolutionNode<scope extends dict = dict> =
    | AttributesNode<scope>
    | BranchesNode<scope>

export type BranchesNode<scope extends dict = dict> = array<
    NameNode<scope> | AttributesNode<scope>
>
