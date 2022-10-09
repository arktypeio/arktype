import { Branching } from "./branching/branching.js"
import { Infix } from "./infix/infix.js"
import { Postfix } from "./postfix/postfix.js"

export namespace Expression {
    export const tokens = {
        ...Postfix.tokens,
        ...Infix.tokens,
        ...Branching.tokens
    }

    export type Token = keyof typeof tokens

    export type BinaryToken = Infix.Token | Branching.Token
}
