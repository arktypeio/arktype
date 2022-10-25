export namespace Comparator {
    export const tokens = {
        "<": "less than",
        ">": "greater than",
        "<=": "at most",
        ">=": "at least",
        "==": "exactly"
    } as const

    export type Token = keyof typeof tokens

    export const invertedComparators = {
        "<": ">",
        ">": "<",
        "<=": ">=",
        ">=": "<=",
        "==": "=="
    } as const

    export type InvertedComparators = typeof invertedComparators

    export const pairableTokens = {
        "<": 1,
        "<=": 1
    } as const

    export type PairableToken = keyof typeof pairableTokens

    export const startChar = {
        "<": 1,
        ">": 1,
        "=": 1
    }

    export type StartChar = keyof typeof startChar

    export const oneCharTokens = {
        "<": 1,
        ">": 1
    }

    export type OneCharToken = keyof typeof oneCharTokens

    export type buildInvalidDoubleMessage<comparator extends Token> =
        `Double-bound expressions must specify their bounds using < or <= (was ${comparator}).`

    export const buildInvalidDoubleMessage = <comparator extends Token>(
        comparator: comparator
    ): buildInvalidDoubleMessage<comparator> =>
        `Double-bound expressions must specify their bounds using < or <= (was ${comparator}).`
}
