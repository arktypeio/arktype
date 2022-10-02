import { keySet } from "@re-/tools"
import type { Bound } from "../../../../nodes/expression/bound.js"

export namespace Comparators {
    export const startChar = keySet({
        "<": 1,
        ">": 1,
        "=": 1
    })

    export type StartChar = keyof typeof startChar

    export const oneChar = keySet({
        "<": 1,
        ">": 1
    })

    export type OneChar = keyof typeof oneChar

    export type InvalidDoubleMessage<Token extends Bound.Token> =
        `Double-bound expressions must specify their bounds using < or <= (was ${Token}).`

    export const invalidDoubleMessage = <Token extends Bound.Token>(
        token: Token
    ): InvalidDoubleMessage<Token> =>
        `Double-bound expressions must specify their bounds using < or <= (was ${token}).`
}
