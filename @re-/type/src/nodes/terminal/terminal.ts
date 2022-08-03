import { Base } from "../base/index.js"
import { Lexer, ParserState } from "../parser/index.js"
import { AliasNode, AliasType } from "./alias.js"
import { Keyword } from "./keyword/index.js"
import {
    BigintLiteralDefinition,
    BigintLiteralNode,
    InferLiteral,
    NumberLiteralDefinition,
    NumberLiteralNode,
    RegexLiteralDefinition,
    regexLiteralToNode,
    StringLiteralDefinition,
    StringLiteralNode
} from "./literal/index.js"

export namespace Terminal {
    export type IsResolvableName<Def, Dict> = Def extends Keyword.Definition
        ? true
        : Def extends keyof Dict
        ? true
        : false

    export type Parse<S extends ParserState.Type, Dict> = IsResolvableName<
        S["R"]["lookahead"],
        Dict
    > extends true
        ? ParserState.From<{
              L: ParserState.SetRoot<S["L"], S["R"]["lookahead"]>
              R: Lexer.ShiftOperator<S["R"]["unscanned"]>
          }>
        : ValidateLiteral<S["R"]["lookahead"]> extends S["R"]["lookahead"]
        ? ParserState.From<{
              L: ParserState.SetRoot<S["L"], S["R"]["lookahead"]>
              R: Lexer.ShiftOperator<S["R"]["unscanned"]>
          }>
        : ParserState.Error<S, ValidateLiteral<S["R"]["lookahead"]>>

    type ValidateLiteral<Token extends string> =
        Token extends StringLiteralDefinition
            ? Token
            : Token extends RegexLiteralDefinition
            ? Token extends "//"
                ? `Regex literals cannot be empty.`
                : Token
            : Token extends NumberLiteralDefinition | BigintLiteralDefinition
            ? Token
            : Token extends ""
            ? `Expected an expression.`
            : `'${Token}' does not exist in your space.`

    export const parse = (s: ParserState.Value, ctx: Base.Parsing.Context) => {
        if (Keyword.matches(s.scanner.lookahead)) {
            s.root = Keyword.parse(s.scanner.lookahead)
        } else if (AliasNode.matches(s.scanner.lookahead, ctx)) {
            s.root = new AliasNode(s.scanner.lookahead, ctx)
        } else if (
            s.scanner.lookahead[0] === `'` ||
            s.scanner.lookahead[0] === `"`
        ) {
            s.root = new StringLiteralNode(s.scanner.lookahead)
        } else if (s.scanner.lookahead[0] === `/`) {
            if (s.scanner.lookahead === "//") {
                throw new Error(`Regex literals cannot be empty.`)
            }
            s.root = regexLiteralToNode(
                s.scanner.lookahead as RegexLiteralDefinition
            )
        } else if (NumberLiteralNode.matches(s.scanner.lookahead)) {
            s.root = new NumberLiteralNode(s.scanner.lookahead)
        } else if (BigintLiteralNode.matches(s.scanner.lookahead)) {
            s.root = new BigintLiteralNode(s.scanner.lookahead)
        } else if (s.scanner.lookahead === "") {
            throw new Error("Expected an expression.")
        } else {
            throw new Error(
                `'${s.scanner.lookahead}' does not exist in your space.`
            )
        }
        Lexer.shiftOperator(s.scanner)
    }
}

export type InferTerminalStr<
    Token extends string,
    Ctx extends Base.Parsing.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["dict"]
    ? AliasType.Infer<Token, Ctx>
    : InferLiteral<Token>
