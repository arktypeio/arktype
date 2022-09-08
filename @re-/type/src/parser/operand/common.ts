export * from "../common.js"
export * from "../parser/index.js"

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
