import { Branching } from "./branching/branching.js"
import { Infix } from "./infix/infix.js"
import { Postfix } from "./postfix/postfix.js"

export namespace Tokens {
    export const binary = {
        ...Branching.tokens,
        ...Infix.tokens
    }

    export type Binary = keyof typeof binary

    export const base = {
        ...Postfix.tokens,
        ...binary
    }

    export type Base = keyof typeof base
}
