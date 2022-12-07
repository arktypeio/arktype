import type { autocompleteString, listable } from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { Keyword } from "./names.js"
import type { ObjectAttributes } from "./object.js"
import type {
    NumberAttributes,
    PrimitiveLiteral,
    StringAttributes
} from "./primitive.js"

export type Node = NameNode | ResolutionNode

export type NameNode = autocompleteString<Keyword>

export type ResolutionNode = {
    readonly object?: true | listable<string | ObjectAttributes>
    readonly string?:
        | true
        | listable<string | PrimitiveLiteral<string> | StringAttributes>
    readonly number?:
        | true
        | listable<string | PrimitiveLiteral<number> | NumberAttributes>
    readonly bigint?: true | listable<string | PrimitiveLiteral<IntegerLiteral>>
    readonly boolean?: true | PrimitiveLiteral<boolean>
    readonly symbol?: true
    readonly null?: true
    readonly undefined?: true
}
