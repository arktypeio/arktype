import { keySet } from "@re-/tools"
import { comparatorChars } from "../operator/bound/common.js"
import { scanner } from "../state/scanner.js"

export const expressionExpectedMessage = <Unscanned extends string>(
    unscanned: Unscanned
) =>
    `Expected an expression${
        unscanned ? ` (was '${unscanned}')` : ""
    }.` as ExpressionExpectedMessage<Unscanned>

export type ExpressionExpectedMessage<Unscanned extends string> =
    `Expected an expression${Unscanned extends ""
        ? ""
        : ` (was '${Unscanned}')`}.`

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
