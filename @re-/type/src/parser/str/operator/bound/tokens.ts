import { keySet } from "@re-/tools"
import type { Bound } from "../../../../nodes/nonTerminal/binary/bound.js"

export namespace ComparatorTokens {
    export const startChar = keySet({
        "<": 1,
        ">": 1,
        "=": 1
    })

    export type StartChar = keyof typeof startChar

    export const doublable = keySet({
        "<=": 1,
        "<": 1
    })

    export type Doublable = keyof typeof doublable

    export const singleOnly = keySet({
        ">=": 1,
        ">": 1,
        "==": 1
    })

    export type SingleOnly = keyof typeof singleOnly

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
