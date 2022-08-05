import { Base } from "../base/index.js"
import { Lexer, State } from "../parser/index.js"
import { AliasNode, AliasType } from "./alias.js"
import { Keyword } from "./keyword/index.js"
import {
    BigintLiteralNode,
    InferLiteral,
    LiteralDefinition,
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

    export type Parse<S extends State.Type, Dict> = IsResolvableName<
        S["scanner"]["lookahead"],
        Dict
    > extends true
        ? State.ShiftOperator<S, S["scanner"]["lookahead"]>
        : S["scanner"]["lookahead"] extends LiteralDefinition
        ? State.ShiftOperator<S, S["scanner"]["lookahead"]>
        : State.Error<
              S,
              `'${S["scanner"]["lookahead"]}' is not a builtin type and does not exist in your space.`
          >

    export const parse = (s: State.Value, ctx: Base.Parsing.Context) => {
        if (Keyword.matches(s.scanner.lookahead)) {
            s.root = Keyword.parse(s.scanner.lookahead)
        } else if (AliasNode.matches(s.scanner.lookahead, ctx)) {
            s.root = new AliasNode(s.scanner.lookahead, ctx)
            /**
             * The Lexer is responsible for validating EnclosedLiterals.
             * As long as the first character is <'><"> or </>,
             * we are assuming the rest of the token is of the expected literal type.
             **/
        } else if (
            s.scanner.lookahead[0] === `'` ||
            s.scanner.lookahead[0] === `"`
        ) {
            s.root = new StringLiteralNode(
                s.scanner.lookahead as StringLiteralDefinition
            )
        } else if (s.scanner.lookahead[0] === `/`) {
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
                `'${s.scanner.lookahead}' is not a builtin type and does not exist in your space.`
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
