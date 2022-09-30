import { Base } from "../base.js"
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

    export abstract class Node<
        Children extends Base.node[] = Base.node[]
    > extends Base.node {
        constructor(protected children: Children) {
            super()
        }
    }
}
