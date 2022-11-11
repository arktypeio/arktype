import type { DynamicState } from "../state/dynamic.js"
import type { Scanner } from "../state/scanner.js"
import type { state, StaticState } from "../state/static.js"
import type { EnclosingChar } from "./enclosed.js"
import { enclosingChar, parseEnclosed } from "./enclosed.js"
import { parseUnenclosed } from "./unenclosed.js"

export const parseOperand = (s: DynamicState): void =>
    s.scanner.lookahead === ""
        ? s.error(buildMissingOperandMessage(s))
        : s.scanner.lookahead === "("
        ? s.reduceGroupOpen()
        : s.scanner.lookaheadIsIn(enclosingChar)
        ? parseEnclosed(s, s.scanner.shift())
        : s.scanner.lookahead === " "
        ? parseOperand(s.shiftedByOne())
        : parseUnenclosed(s)

export type parseOperand<
    s extends StaticState,
    alias extends string
> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
    ? lookahead extends "("
        ? state.reduceGroupOpen<s, unscanned>
        : lookahead extends EnclosingChar
        ? parseEnclosed<s, lookahead, unscanned>
        : lookahead extends " "
        ? parseOperand<state.scanTo<s, unscanned>, alias>
        : parseUnenclosed<s, alias>
    : state.throws<buildMissingOperandMessage<s>>

export const buildMissingOperandMessage = <s extends DynamicState>(s: s) => {
    const operator = s.previousOperator()
    return operator
        ? buildMissingRightOperandMessage(operator, s.scanner.unscanned)
        : buildExpressionExpectedMessage(s.scanner.unscanned)
}

export type buildMissingOperandMessage<
    s extends StaticState,
    operator extends Scanner.InfixToken | undefined = state.previousOperator<s>
> = operator extends {}
    ? buildMissingRightOperandMessage<operator, s["unscanned"]>
    : buildExpressionExpectedMessage<s["unscanned"]>

export type buildMissingRightOperandMessage<
    token extends Scanner.InfixToken,
    unscanned extends string
> = `Token '${token}' requires a right operand${unscanned extends ""
    ? ""
    : ` before '${unscanned}'`}`

export const buildMissingRightOperandMessage = <
    token extends Scanner.InfixToken,
    unscanned extends string
>(
    token: token,
    unscanned: unscanned
): buildMissingRightOperandMessage<token, unscanned> =>
    `Token '${token}' requires a right operand${
        unscanned ? "" : (` before '${unscanned}'` as any)
    }`

export const buildExpressionExpectedMessage = <unscanned extends string>(
    unscanned: unscanned
) =>
    `Expected an expression${
        unscanned ? ` before '${unscanned}'` : ""
    }` as buildExpressionExpectedMessage<unscanned>

export type buildExpressionExpectedMessage<unscanned extends string> =
    `Expected an expression${unscanned extends ""
        ? ""
        : ` before '${unscanned}'`}`
