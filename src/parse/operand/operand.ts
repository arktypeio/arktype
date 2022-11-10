import type { dictionary } from "../../utils/dynamicTypes.js"
import { throwParseError } from "../common.js"
import type { DynamicState } from "../state/dynamic.js"
import type { Scanner } from "../state/scanner.js"
import type { errorState, scanStateTo, StaticState } from "../state/static.js"
import { previousOperator } from "../state/static.js"
import type { EnclosingChar } from "./enclosed.js"
import { enclosingChar, parseEnclosed } from "./enclosed.js"
import { parseGroupOpen } from "./groupOpen.js"
import { parseUnenclosed } from "./unenclosed.js"

export const parseOperand = (s: DynamicState): DynamicState =>
    s.scanner.lookahead === ""
        ? throwParseError(buildMissingOperandMessage(s))
        : s.scanner.lookahead === "("
        ? parseGroupOpen(shifted(s))
        : s.scanner.lookaheadIsIn(enclosingChar)
        ? parseEnclosed(s, s.scanner.shift())
        : s.scanner.lookahead === " "
        ? parseOperand(shifted(s))
        : parseUnenclosed(s)

export type parseOperand<
    s extends StaticState,
    scope extends dictionary
> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
    ? lookahead extends "("
        ? parseGroupOpen<s, unscanned>
        : lookahead extends EnclosingChar
        ? parseEnclosed<s, lookahead, unscanned>
        : lookahead extends " "
        ? parseOperand<scanStateTo<s, unscanned>, scope>
        : parseUnenclosed<s, scope>
    : errorState<buildMissingOperandMessage<s>>

export const buildMissingOperandMessage = <s extends DynamicState>(s: s) => {
    const operator = previousOperator(s)
    return operator
        ? buildMissingRightOperandMessage(operator, s.scanner.unscanned)
        : buildExpressionExpectedMessage(s.scanner.unscanned)
}

export type buildMissingOperandMessage<
    s extends StaticState,
    operator extends Scanner.InfixToken | undefined = previousOperator<s>
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
