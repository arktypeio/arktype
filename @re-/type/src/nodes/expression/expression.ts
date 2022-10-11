import type { Branching } from "./branching/branching.js"
import { Bound } from "./constraining/bound.js"
import type { Divisibility } from "./constraining/divisibility.js"
import type { Postfix } from "./postfix/postfix.js"

export namespace Expression {
    export const tokens: Record<Token, 1> = {
        "?": 1,
        "[]": 1,
        "|": 1,
        "&": 1,
        "%": 1,
        ...Bound.tokens
    }

    export type Token = Postfix.Token | BinaryToken

    export type BinaryToken = ConstraintToken | Branching.Token

    export type ConstraintToken = Bound.Token | Divisibility.Token
}
