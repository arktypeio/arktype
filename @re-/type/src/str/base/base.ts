import { Node } from "../common.js"
import { Group } from "../operator/index.js"
import { Scanner, state, State, Tokens } from "../parser/index.js"
import { GroupOpen, Terminal } from "./nodes.js"

const expressionExpectedMessage = `Expected an expression.`
type ExpressionExpectedMessage = typeof expressionExpectedMessage

export const base = (s: state, ctx: Node.Context): state => {
    const lookahead = s.r.shift()
    return lookahead === "("
        ? GroupOpen.reduce(s)
        : Tokens.inTokenSet(lookahead, Tokens.enclosedBaseStartChars)
        ? Terminal.enclosedBase(s, lookahead)
        : lookahead === " "
        ? base(s, ctx)
        : lookahead === "END"
        ? state.error(expressionExpectedMessage)
        : Terminal.unenclosedBase(s, ctx)
}

export type Base<S extends State, Dict> = S["R"] extends Scanner.Shift<
    infer Lookahead,
    infer Unscanned
>
    ? Lookahead extends "("
        ? State.From<{ L: Group.ReduceOpen<S["L"]>; R: Unscanned }>
        : Lookahead extends Tokens.EnclosedBaseStartChar
        ? Terminal.EnclosedBase<S, Lookahead>
        : Lookahead extends " "
        ? Base<{ L: S["L"]; R: Unscanned }, Dict>
        : Terminal.UnenclosedBase<S, Lookahead, Unscanned, Dict>
    : State.Error<ExpressionExpectedMessage>
