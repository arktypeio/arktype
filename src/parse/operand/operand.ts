import type { StaticParserContext } from "../common.js"
import { throwParseError } from "../common.js"
import type { Scanner } from "../state/scanner.js"
import { State } from "../state/state.js"
import type { EnclosingChar } from "./enclosed.js"
import { enclosingChar, parseEnclosed } from "./enclosed.js"
import { parseGroupOpen } from "./groupOpen.js"
import { parseUnenclosed } from "./unenclosed.js"

export const parseOperand = (s: State.Dynamic): State.Dynamic =>
    s.scanner.lookahead === ""
        ? throwParseError(buildMissingOperandMessage(s))
        : s.scanner.lookahead === "("
        ? parseGroupOpen(State.shifted(s))
        : s.scanner.lookaheadIsIn(enclosingChar)
        ? parseEnclosed(s, s.scanner.shift())
        : s.scanner.lookahead === " "
        ? parseOperand(State.shifted(s))
        : parseUnenclosed(s)

export type parseOperand<
    s extends State.Static,
    context extends StaticParserContext
> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
    ? lookahead extends "("
        ? parseGroupOpen<s, unscanned>
        : lookahead extends EnclosingChar
        ? parseEnclosed<s, lookahead, unscanned>
        : lookahead extends " "
        ? parseOperand<State.scanTo<s, unscanned>, context>
        : parseUnenclosed<s, context>
    : State.error<buildMissingOperandMessage<s>>

export const buildMissingOperandMessage = <s extends State.Dynamic>(s: s) => {
    const previousOperator = State.previousOperator(s)
    return previousOperator
        ? buildMissingRightOperandMessage(previousOperator, s.scanner.unscanned)
        : buildExpressionExpectedMessage(s.scanner.unscanned)
}

export type buildMissingOperandMessage<
    s extends State.Static,
    previousOperator extends
        | Scanner.InfixToken
        | undefined = State.previousOperator<s>
> = previousOperator extends {}
    ? buildMissingRightOperandMessage<previousOperator, s["unscanned"]>
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
