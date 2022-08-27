import { Node, Parser } from "./common.js"
import {
    EnclosedBaseStartChar,
    enclosedBaseStartChars,
    parseEnclosedBase,
    ParseEnclosedBase,
    RegexLiteralDefinition,
    StringLiteralDefinition
} from "./enclosed/index.js"
import { reduceGroupOpen, ReduceGroupOpen } from "./groupOpen.js"
import {
    Alias,
    BigintLiteralDefinition,
    Keyword,
    NumberLiteralDefinition,
    parseUnenclosedBase,
    ParseUnenclosedBase
} from "./unenclosed/index.js"

export const expressionExpectedMessage = `Expected an expression.`
type ExpressionExpectedMessage = typeof expressionExpectedMessage

// TODO: Check setting variable ahead of time perf
export const parseOperand = (
    s: Parser.state,
    ctx: Node.context
): Parser.state =>
    s.r.lookahead === "("
        ? reduceGroupOpen(s.shifted())
        : s.r.lookaheadIsIn(enclosedBaseStartChars)
        ? parseEnclosedBase(s, s.r.shift())
        : s.r.lookahead === " "
        ? parseOperand(s.shifted(), ctx)
        : s.r.lookahead === "END"
        ? s.error(expressionExpectedMessage)
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
        : Lookahead extends EnclosedBaseStartChar
        ? ParseEnclosedBase<S, Lookahead>
        : Lookahead extends " "
        ? ParseOperand<{ L: S["L"]; R: Unscanned }, Dict>
        : ParseUnenclosedBase<S, Lookahead, Unscanned, Dict>
    : Parser.State.Error<ExpressionExpectedMessage>

export type InferTerminal<
    Token extends string,
    Ctx extends Node.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["Resolutions"]
    ? Alias.Infer<Token, Ctx>
    : Token extends StringLiteralDefinition<infer Value>
    ? Value
    : Token extends RegexLiteralDefinition
    ? string
    : Token extends NumberLiteralDefinition<infer Value>
    ? Value
    : Token extends BigintLiteralDefinition<infer Value>
    ? Value
    : unknown
