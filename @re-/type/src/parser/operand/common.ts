import { comparatorChars } from "../operator/bound/common.js"
import { scanner } from "../parser/scanner.js"

export const expressionExpectedMessage = <Unscanned extends string>(
    unscanned: Unscanned
) =>
    `Expected an expression${
        unscanned ? ` (got '${unscanned}')` : ""
    }.` as ExpressionExpectedMessage<Unscanned>

export type ExpressionExpectedMessage<Unscanned extends string> =
    `Expected an expression${Unscanned extends ""
        ? ""
        : ` (got '${Unscanned}')`}.`

export const baseTerminatingChars = scanner.tokens({
    ...comparatorChars,
    "?": 1,
    "|": 1,
    "&": 1,
    ")": 1,
    "[": 1,
    " ": 1
})

export type BaseTerminatingChar = keyof typeof baseTerminatingChars
