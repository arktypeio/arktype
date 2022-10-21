import { Branching } from "./branching/branching.js"
import { Infix } from "./infix/infix.js"
import { Postfix } from "./postfix/postfix.js"

export namespace Expression {
    export const binaryTokens = {
        ...Branching.tokens,
        ...Infix.tokens
    }

    export type BinaryToken = keyof typeof binaryTokens

    export const baseTokens = {
        ...Postfix.tokens,
        ...binaryTokens
    }

    export type BaseToken = keyof typeof baseTokens

    export type Kinds = Postfix.Kinds & Infix.Kinds & Branching.Kinds
}
