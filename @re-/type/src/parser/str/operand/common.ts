import { keySet } from "@re-/tools"
import { comparatorChars } from "../operator/unary/bound/common.js"

export const expressionExpectedMessage = <Unscanned extends string>(
    unscanned: Unscanned
) =>
    `Expected an expression${
        unscanned ? ` before '${unscanned}'` : ""
    }.` as ExpressionExpectedMessage<Unscanned>

export type ExpressionExpectedMessage<Unscanned extends string> =
    `Expected an expression${Unscanned extends ""
        ? ""
        : ` before '${Unscanned}'`}.`

export const baseTerminatingChars = keySet({
    ...comparatorChars,
    "?": 1,
    "|": 1,
    "&": 1,
    ")": 1,
    "[": 1,
    " ": 1
})

export type BaseTerminatingChar = keyof typeof baseTerminatingChars
