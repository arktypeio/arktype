import { Iteration, ListChars } from "@re-/tools"
import { AliasIn } from "../../space.js"
import { Alias } from "./alias.js"
import { Base } from "./base.js"
import { Bound } from "./bound.js"
import { EmbeddedBigInt, EmbeddedNumber, EmbeddedRegex } from "./embedded.js"
import { Intersection } from "./intersection.js"
import { Keyword } from "./keyword/keyword.js"
import { List } from "./list.js"
import { Optional } from "./optional.js"
import { StringLiteral } from "./stringLiteral.js"
import { Union } from "./union.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = ParseTokens<
        LexRoot<Def>,
        Dict
    >

    export type Validate<Def extends string, Dict> = ValidateParseTree<
        Def,
        Parse<Def, Dict>
    >

    export type TypeOf<Def extends string, Dict, Seen> = TypeOfParseTree<
        Parse<Def, Dict>,
        Dict,
        Seen
    >

    type ValidateParseTree<
        RootDef extends string,
        Tree
    > = Tree extends Terminal.Base<unknown, string, infer Error>
        ? Error extends undefined
            ? RootDef
            : Error
        : Tree extends Iteration<unknown, infer Branch, infer RemainingTokens>
        ? ValidateParseTree<RootDef, Branch> extends RootDef
            ? ValidateParseTree<RootDef, RemainingTokens>
            : ValidateParseTree<RootDef, Branch>
        : RootDef

    type TypeOfParseTree<Tree, Dict, Seen> = Tree extends Terminal.Base<
        infer Type,
        infer Def
    >
        ? // We don't have to use AliasIn here since if Def was a $meta key, this will be an Error Terminal
          Def extends keyof Dict
            ? Alias.TypeOf<Def, Dict, Seen>
            : Type
        : Tree extends [infer Next, "?"]
        ? TypeOfParseTree<Next, Dict, Seen> | undefined
        : Tree extends [infer Next, "[]"]
        ? TypeOfParseTree<Next, Dict, Seen>[]
        : Tree extends [infer Left, "|", infer Right]
        ? TypeOfParseTree<Left, Dict, Seen> | TypeOfParseTree<Right, Dict, Seen>
        : Tree extends [infer Left, "&", infer Right]
        ? TypeOfParseTree<Left, Dict, Seen> & TypeOfParseTree<Right, Dict, Seen>
        : unknown

    type ParseTokens<Tokens extends string[], Dict> = Tokens extends ErrorToken<
        infer Message
    >
        ? Terminal.Error<Message>
        : ParseExpression<Tokens, Dict>

    export type References<Def extends string> = ExtractReferences<
        LexRoot<Def>,
        []
    >

    type ExtractReferences<
        Tokens extends string[],
        Refs extends string[]
    > = Tokens extends Iteration<string, infer Token, infer RemainingTokens>
        ? ExtractReferences<
              RemainingTokens,
              Token extends NonTerminalToken ? Refs : [...Refs, Token]
          >
        : Refs

    type LexRoot<Def extends string> = Lex<"", [], ListChars<Def>>

    type NonTerminalToken = "(" | ")" | OperatorToken

    type OperatorToken = "[]" | "?" | "|" | "&" | ComparatorToken

    type ComparatorToken = "<" | ">" | "<=" | ">=" | "=="

    type Lex<
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[]
    > = Unscanned extends Iteration<string, infer NextChar, infer NextUnscanned>
        ? NextChar extends `[`
            ? LexList<Fragment, Tokens, NextUnscanned>
            : NextChar extends "?"
            ? NextUnscanned extends []
                ? LexNonTerminal<NextChar, Fragment, Tokens, NextUnscanned>
                : ErrorToken<`Modifier '?' is only valid at the end of a type definition.`>
            : NextChar extends "|" | "&" | "(" | ")"
            ? LexNonTerminal<NextChar, Fragment, Tokens, NextUnscanned>
            : NextChar extends LiteralEnclosingChar
            ? LexLiteral<NextChar, "", Tokens, NextUnscanned>
            : NextChar extends ComparatorStartChar
            ? LexBound<NextChar, Fragment, Tokens, NextUnscanned>
            : NextChar extends " "
            ? Lex<Fragment, Tokens, NextUnscanned>
            : Lex<`${Fragment}${NextChar}`, Tokens, NextUnscanned>
        : Fragment extends ""
        ? Tokens
        : [...Tokens, Fragment]

    type ComparatorStartChar = "<" | ">" | "="

    type LiteralEnclosingChar = `'` | `"` | `/`

    type LexBound<
        FirstChar extends ComparatorStartChar,
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[]
    > = Unscanned extends [infer NextChar, ...infer NextUnscanned]
        ? NextChar extends "="
            ? LexNonTerminal<
                  `${FirstChar}=`,
                  Fragment,
                  Tokens,
                  // @ts-expect-error
                  NextUnscanned
              >
            : FirstChar extends "="
            ? ErrorToken<`= is not a valid comparator. Use == instead.`>
            : LexNonTerminal<
                  // @ts-expect-error
                  FirstChar,
                  Fragment,
                  Tokens,
                  // Use Unscanned here instead of NextUnscanned since the comparator was only 1 character
                  Unscanned
              >
        : ErrorToken<`Expected a bound condition after ${FirstChar}.`>

    type LexNonTerminal<
        Token extends NonTerminalToken,
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[]
    > = Lex<"", PushTokensFrom<Token, Fragment, Tokens>, Unscanned>

    type PushTokensFrom<
        Token extends NonTerminalToken,
        Fragment extends string,
        Tokens extends string[]
    > = Fragment extends "" ? [...Tokens, Token] : [...Tokens, Fragment, Token]

    type LexList<
        Fragment extends string,
        Tokens extends string[],
        UnscannedChars extends string[]
    > = UnscannedChars extends [infer NextChar, ...infer NextUnscanned]
        ? NextChar extends "]"
            ? LexNonTerminal<
                  "[]",
                  Fragment,
                  Tokens,
                  // @ts-expect-error TS can't infer that NextUnscanned is a string[]
                  NextUnscanned
              >
            : ErrorToken<`Missing expected ']'.`>
        : never

    type LexLiteral<
        Enclosing extends LiteralEnclosingChar,
        Literal extends string,
        Tokens extends string[],
        Unscanned extends string[]
    > = Unscanned extends Iteration<string, infer NextChar, infer NextUnscanned>
        ? NextChar extends Enclosing
            ? Lex<
                  "",
                  [...Tokens, `${Enclosing}${Literal}${Enclosing}`],
                  NextUnscanned
              >
            : LexLiteral<
                  Enclosing,
                  `${Literal}${NextChar}`,
                  Tokens,
                  NextUnscanned
              >
        : ErrorToken<`Expected a closing ${Enclosing} token for literal expression ${Enclosing}${Literal}`>

    type ErrorToken<Message extends string> = ["ERROR", Message]

    /** An Expression is a list of tokens that must form a completed type to be valid */
    type ParseExpression<
        Tokens extends string[],
        Dict
    > = Tokens extends Iteration<string, infer Token, infer RemainingTokens>
        ? Token extends "("
            ? ParseGroup<SplitByMatchingParen<RemainingTokens, [], []>, Dict>
            : Token extends ")"
            ? Terminal.Error<"Unexpected ).">
            : Token extends OperatorToken
            ? Terminal.Error<`Expression expected (got ${Token}).`>
            : ParseFragment<RemainingTokens, ParseTerminal<Token, Dict>, Dict>
        : Terminal.Error<`Expected an expression.`>

    /** A Fragment is a list of tokens that modify or branch Tree (a parsed Expression) */
    type ParseFragment<
        Tokens extends string[],
        Tree,
        Dict
    > = Tokens extends Iteration<string, infer Token, infer RemainingTokens>
        ? Token extends ModifyingToken
            ? ParseFragment<RemainingTokens, [Tree, Token], Dict>
            : Token extends BranchingOperatorToken
            ? [Tree, Token, ParseExpression<RemainingTokens, Dict>]
            : Token extends ComparatorToken
            ? ParseBound<Token, RemainingTokens, Tree, Dict>
            : Terminal.Error<`Expected an operator (got ${Token}).`>
        : Tree

    /** These tokens modify the current expression */
    type ModifyingToken = "[]" | "?"

    /** These tokens complete the current expression and start parsing a new expression from RemainingTokens.
     *
     *  Instead of passing the updated tree to ParseExpression like a ModifyingToken
     *  BranchingTokens return the left half of the expression and the token directly,
     *  thus finalizing them, and then begin parsing the right half. This ensures
     *  that, in absence of parentheses, an expression like "string|number[]" is parsed as:
     *     string | (number[])
     *  instead of:
     *     (string | number)[]
     **/
    type BranchingOperatorToken = "|" | "&"

    /**  */
    type ParseBound<
        Comparator extends ComparatorToken,
        RemainingTokens extends string[],
        Tree,
        Dict
    > = RemainingTokens extends [
        infer LookaheadToken,
        ...infer NextRemainingTokens
    ]
        ? LookaheadToken extends EmbeddedNumber.Definition
            ? AssertBoundableThen<
                  Tree,
                  // @ts-expect-error
                  ParseFragment<NextRemainingTokens, Tree, Dict>
              >
            : Tree extends Terminal.DefinedFrom<EmbeddedNumber.Definition>
            ? ParseExpression<RemainingTokens, Dict>
            : Terminal.Error<`One side of comparator ${Comparator} must be a number literal.`>
        : Terminal.Error<`Right side of comparator ${Comparator} is missing.`>

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanumeric" in "100>alphanumeric")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    type BoundableNode =
        | Terminal.DefinedFrom<Keyword.OfTypeNumber | Keyword.OfTypeString>
        | [unknown, "[]"]

    type AssertBoundableThen<Node, Next> = Node extends BoundableNode
        ? Next
        : Terminal.Error<`Bounded expression must be a numbed-or-string-typed keyword or a list-typed expression.`>

    type ParseGroup<Sliced, Dict> = Sliced extends [
        infer Group,
        infer RemainingTokens
    ]
        ? ParseFragment<
              // @ts-expect-error
              RemainingTokens,
              // @ts-expect-error
              ParseExpression<Group, Dict>,
              Dict
          >
        : Sliced

    type SplitByMatchingParen<
        Tokens,
        BeforeMatch extends string[],
        Depth extends unknown[]
    > = Tokens extends Iteration<string, infer Token, infer RemainingTokens>
        ? Token extends "("
            ? SplitByMatchingParen<
                  RemainingTokens,
                  [...BeforeMatch, Token],
                  [...Depth, 1]
              >
            : Token extends ")"
            ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
              Depth extends [...infer DepthMinusOne, infer Pop]
                ? SplitByMatchingParen<
                      RemainingTokens,
                      [...BeforeMatch, Token],
                      DepthMinusOne
                  >
                : [BeforeMatch, RemainingTokens]
            : SplitByMatchingParen<
                  RemainingTokens,
                  [...BeforeMatch, Token],
                  Depth
              >
        : Terminal.Error<"Missing ).">

    type ParseTerminal<Token extends string, Dict> = TerminalTypeToNode<
        Token,
        TypeOfTerminal<Token, Dict>
    >

    type TerminalTypeToNode<
        Token extends string,
        TerminalType
    > = IsResolvable<TerminalType> extends true
        ? Terminal.Base<TerminalType, Token>
        : Terminal.Error<`'${Token}' does not exist in your space.`>

    type UNRESOLVABLE = "__UNRESOLVABLE__"

    type IsResolvable<T> = T extends UNRESOLVABLE
        ? unknown extends T
            ? true
            : false
        : true

    type TypeOfTerminal<
        Token extends string,
        Dict
    > = Token extends Keyword.Definition
        ? Keyword.Types[Token]
        : Token extends AliasIn<Dict>
        ? // Alias types are resolved dynamically
          unknown
        : Token extends `'${infer Value}'`
        ? Value
        : Token extends `"${infer Value}"`
        ? Value
        : Token extends `/${string}/`
        ? string
        : Token extends EmbeddedNumber.Definition<infer Value>
        ? Value
        : Token extends EmbeddedBigInt.Definition<infer Value>
        ? Value
        : UNRESOLVABLE

    export namespace Terminal {
        export type Base<
            Type,
            Def extends string,
            Error extends string | undefined = undefined
        > = {
            type: Type
            def: Def
            error: Error
        }

        export type DefinedFrom<Def extends string> = Base<
            unknown,
            Def,
            undefined
        >

        export type Error<Message extends string> = Base<
            unknown,
            string,
            Message
        >
    }

    export const matches = (def: unknown): def is string =>
        typeof def === "string"

    export const parse: Base.Parsing.Parser<string> = (def, ctx) => {
        if (Optional.matches(def)) {
            return new Optional.Node(def, ctx)
        } else if (Keyword.matches(def)) {
            return Keyword.parse(def, ctx)
        } else if (Alias.matches(def, ctx)) {
            return new Alias.Node(def, ctx)
        } else if (StringLiteral.matches(def)) {
            return new StringLiteral.Node(def, ctx)
        } else if (EmbeddedRegex.matches(def)) {
            return EmbeddedRegex.parse(def, ctx)
        } else if (EmbeddedNumber.matches(def)) {
            return EmbeddedNumber.parse(def, ctx)
        } else if (EmbeddedBigInt.matches(def)) {
            return EmbeddedBigInt.parse(def, ctx)
        } else if (Intersection.matches(def)) {
            return new Intersection.Node(def, ctx)
        } else if (Union.matches(def)) {
            return new Union.Node(def, ctx)
        } else if (List.matches(def)) {
            return new List.Node(def, ctx)
        } else if (Bound.matches(def)) {
            return new Bound.Node(def, ctx)
        }
        throw new Base.Parsing.ParseError(
            `Unable to determine the type of '${Base.defToString(
                def
            )}'${Base.stringifyPathContext(ctx.path)}.`
        )
    }
}
