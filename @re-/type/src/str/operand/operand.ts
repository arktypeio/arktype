import { Node, Parser } from "./common.js"
import { ParseEnclosedBase, parseEnclosedBase } from "./enclosed/enclosed.js"
import { reduceGroupOpen, ReduceGroupOpen } from "./groupOpen.js"
import {
    ParseUnenclosedBase,
    parseUnenclosedBase
} from "./unenclosed/unenclosed.js"

export const expressionExpectedMessage = `Expected an expression.`
type ExpressionExpectedMessage = typeof expressionExpectedMessage

// TODO: Check setting variable ahead of time perf
export const parseOperand = (
    s: Parser.state,
    ctx: Node.context
): Parser.state =>
    s.r.lookahead === "("
        ? reduceGroupOpen(s.shifted())
        : s.r.lookaheadIsIn(Parser.Tokens.enclosedBaseStartChars)
        ? parseEnclosedBase(s, s.r.shift())
        : s.r.lookahead === " "
        ? parseOperand(s.shifted(), ctx)
        : s.r.lookahead === "END"
        ? Parser.state.error(expressionExpectedMessage)
        : parseUnenclosedBase(s, ctx)

export type ParseOperand<
    S extends Parser.State,
    Dict
> = S["R"] extends Parser.Scanner.Shift<infer Lookahead, infer Unscanned>
    ? Lookahead extends "("
        ? Parser.State.From<{
              L: ReduceGroupOpen<S["L"]>
              R: Unscanned
          }>
        : Lookahead extends Parser.Tokens.EnclosedBaseStartChar
        ? ParseEnclosedBase<S, Lookahead>
        : Lookahead extends " "
        ? ParseOperand<{ L: S["L"]; R: Unscanned }, Dict>
        : ParseUnenclosedBase<S, Lookahead, Unscanned, Dict>
    : Parser.State.Error<ExpressionExpectedMessage>
