import type { Base } from "../base.js"
import { Binary } from "./binary/binary.js"
import { Nary } from "./nary/nary.js"
import { Unary } from "./unary/unary.js"

export namespace NonTerminal {
    export const tokens = {
        ...Unary.tokens,
        ...Nary.tokens,
        ...Binary.tokens
    }

    export type Token = Unary.Token | InfixToken

    export type InfixToken = Nary.Token | Binary.Token
}
