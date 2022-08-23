import { Node } from "../common.js"
import { Scanner, state, State, Tokens } from "../parser/index.js"
import { GroupOpen, Terminal } from "./nodes.js"

export const expressionExpectedMessage = `Expected an expression.`
type ExpressionExpectedMessage = typeof expressionExpectedMessage

// TODO: Check setting variable ahead of time perf
export const base = (s: state, ctx: Node.Context): state =>
    s.r.lookahead === "("
        ? GroupOpen.reduce(s.shifted())
        : s.r.lookaheadIsIn(Tokens.enclosedBaseStartChars)
        ? Terminal.enclosedBase(s, s.r.shift())
        : s.r.lookahead === " "
        ? base(s.shifted(), ctx)
        : s.r.lookahead === "END"
        ? state.error(expressionExpectedMessage)
        : Terminal.unenclosedBase(s, ctx)

export type Base<S extends State, Dict> = S["R"] extends Scanner.Shift<
    infer Lookahead,
    infer Unscanned
>
    ? Lookahead extends "("
        ? State.From<{ L: GroupOpen.Reduce<S["L"]>; R: Unscanned }>
        : Lookahead extends Tokens.EnclosedBaseStartChar
        ? Terminal.EnclosedBase<S, Lookahead>
        : Lookahead extends " "
        ? Base<{ L: S["L"]; R: Unscanned }, Dict>
        : Terminal.UnenclosedBase<S, Lookahead, Unscanned, Dict>
    : State.Error<ExpressionExpectedMessage>
