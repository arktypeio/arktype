import type { autocompleteString, stringKeyOf } from "../utils/generics.js"
import type { array, dict, TypeName } from "../utils/typeOf.js"
import type { BigintAttributes } from "./attributes/bigint.js"
import type { BooleanAttributes } from "./attributes/boolean.js"
import type { NumberAttributes } from "./attributes/number.js"
import type { ObjectAttributes } from "./attributes/object.js"
import type { StringAttributes } from "./attributes/regex.js"
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

export type AttributesNode<scope extends dict = dict> =
    | ObjectAttributes<scope>
    | StringAttributes
    | NumberAttributes
    | BigintAttributes
    | BooleanAttributes
    | { readonly type: "symbol" | "null" | "undefined" }

export type ExtensibleTypeName = Exclude<
    TypeName,
    "symbol" | "null" | "undefined"
>
