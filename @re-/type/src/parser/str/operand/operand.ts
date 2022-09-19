import type { Base } from "../../../nodes/base.js"
import type { Alias } from "../../../nodes/terminal/alias.js"
import type { Keyword } from "../../../nodes/terminal/keywords/keyword.js"
import type { parseContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"
import type { ExpressionExpectedMessage } from "./common.js"
import { expressionExpectedMessage } from "./common.js"
import type {
    EnclosedBaseStartChar,
    ParseEnclosedBase,
    RegexLiteralDefinition,
    StringLiteralDefinition
} from "./enclosed.js"
import { enclosedBaseStartChars, parseEnclosedBase } from "./enclosed.js"
import type { ReduceGroupOpen } from "./groupOpen.js"
import { reduceGroupOpen } from "./groupOpen.js"
import type {
    BigintLiteralDefinition,
    BooleanLiteralDefinition,
    NumberLiteralDefinition,
    ParseUnenclosedBase
} from "./unenclosed.js"
import { parseUnenclosedBase } from "./unenclosed.js"

export const parseOperand = (s: parserState, ctx: parseContext): parserState =>
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
    : Token extends BooleanLiteralDefinition<infer Value>
    ? Value
    : unknown
