import { Base } from "../../nodes/base.js"
import { RegexLiteralDefinition } from "../../nodes/constraints/regex.js"
import { BigintLiteralDefinition } from "../../nodes/types/terminal/literals/bigint.js"
import { NumberLiteralDefinition } from "../../nodes/types/terminal/literals/number.js"
import { StringLiteralDefinition } from "../../nodes/types/terminal/literals/string.js"
import { Scanner, scanner } from "../parser/scanner.js"
import { ParserState, parserState } from "../parser/state.js"
import {
    ExpressionExpectedMessage,
    expressionExpectedMessage
} from "./common.js"
import {
    EnclosedBaseStartChar,
    enclosedBaseStartChars,
    parseEnclosedBase,
    ParseEnclosedBase
} from "./enclosed.js"
import { ReduceGroupOpen, reduceGroupOpen } from "./groupOpen.js"
import { ParseUnenclosedBase, parseUnenclosedBase } from "./unenclosed.js"

export const parseOperand = (s: parserState, ctx: Base.context): parserState =>
    s.r.lookahead === "("
        ? reduceGroupOpen(s.shifted())
        : s.r.lookaheadIsIn(enclosedBaseStartChars)
        ? parseEnclosedBase(s, s.r.shift())
        : s.r.lookahead === " "
        ? parseOperand(s.shifted(), ctx)
        : s.r.lookahead === "END"
        ? s.error(expressionExpectedMessage(""))
        : parseUnenclosedBase(s, ctx)

export type ParseOperand<
    S extends ParserState,
    Dict
> = S["R"] extends Scanner.Shift<infer Lookahead, infer Unscanned>
    ? Lookahead extends "("
        ? ParserState.From<{
              L: ReduceGroupOpen<S["L"]>
              R: Unscanned
          }>
        : Lookahead extends EnclosedBaseStartChar
        ? ParseEnclosedBase<S, Lookahead>
        : Lookahead extends " "
        ? ParseOperand<{ L: S["L"]; R: Unscanned }, Dict>
        : ParseUnenclosedBase<S, "", S["R"], Dict>
    : ParserState.Error<ExpressionExpectedMessage<"">>

export type InferTerminal<
    Token extends string,
    Ctx extends Base.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["Dict"]
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
