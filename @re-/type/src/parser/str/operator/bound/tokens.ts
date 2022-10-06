import { keySet } from "@re-/tools"
import type { Bound } from "../../../../nodes/expression/infix/bound.js"

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

    export type buildInvalidDoubleMessage<comparator extends Bound.Token> =
        `Double-bound expressions must specify their bounds using < or <= (was ${comparator}).`

    export const buildInvalidDoubleMessage = <comparator extends Bound.Token>(
        comparator: comparator
    ): buildInvalidDoubleMessage<comparator> =>
        `Double-bound expressions must specify their bounds using < or <= (was ${comparator}).`
}
