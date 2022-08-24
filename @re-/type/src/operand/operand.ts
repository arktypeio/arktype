import { Node, Parser } from "./common.js"
import { reduceGroupOpen, ReduceGroupOpen } from "./groupOpen.js"
import { Terminal } from "./terminal.js"

export const expressionExpectedMessage = `Expected an expression.`
type ExpressionExpectedMessage = typeof expressionExpectedMessage

// TODO: Check setting variable ahead of time perf
export const operand = (s: Parser.state, ctx: Node.context): Parser.state =>
    s.r.lookahead === "("
        ? reduceGroupOpen(s.shifted())
        : s.r.lookaheadIsIn(Parser.Tokens.enclosedBaseStartChars)
        ? Terminal.enclosedBase(s, s.r.shift())
        : s.r.lookahead === " "
        ? operand(s.shifted(), ctx)
        : s.r.lookahead === "END"
        ? Parser.state.error(expressionExpectedMessage)
        : Terminal.unenclosedBase(s, ctx)

export type Operand<
    S extends Parser.State,
    Dict
> = S["R"] extends Parser.Scanner.Shift<infer Lookahead, infer Unscanned>
    ? Lookahead extends "("
        ? Parser.State.From<{
              L: ReduceGroupOpen<S["L"]>
              R: Unscanned
          }>
        : Lookahead extends Parser.Tokens.EnclosedBaseStartChar
        ? Terminal.EnclosedBase<S, Lookahead>
        : Lookahead extends " "
        ? Operand<{ L: S["L"]; R: Unscanned }, Dict>
        : Terminal.UnenclosedBase<S, Lookahead, Unscanned, Dict>
    : Parser.State.Error<ExpressionExpectedMessage>
