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
    export type Parse<Def extends string, Dict> = ParseTokens<Lex<Def>, Dict>

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
    > = Tree extends Terminal.Typed<unknown, string, infer Error>
        ? Error extends undefined
            ? RootDef
            : Error
        : // Consider adding type for tree?
        Tree extends Iteration<unknown, infer Node, infer RemainingNodes>
        ? ValidateParseTree<RootDef, Node> extends RootDef
            ? ValidateParseTree<RootDef, RemainingNodes>
            : ValidateParseTree<RootDef, Node>
        : RootDef

    type TypeOfParseTree<Tree, Dict, Seen> = Tree extends Terminal.Typed<
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

    export type References<Def extends string> = ExtractReferences<Lex<Def>, []>

    type ExtractReferences<
        Tokens extends string[],
        Refs extends string[]
    > = Tokens extends Iterate<infer Token, infer RemainingTokens>
        ? ExtractReferences<
              RemainingTokens,
              Token extends NonTerminalToken ? Refs : [...Refs, Token]
          >
        : Refs

    type Lex<Def extends string> = LexExpression<[], ListChars<Def>>

    type NonTerminalToken = "(" | ")" | OperatorToken

    type OperatorToken = "[]" | "?" | "|" | "&" | ComparatorToken

    type ComparatorToken = "<" | ">" | "<=" | ">=" | "=="

    type Scan<Char extends string, Unscanned extends string[]> = [
        Char,
        ...Unscanned
    ]

    type Iterate<Token extends string, Remaining extends string[]> = [
        Token,
        ...Remaining
    ]

    type LexExpression<
        Tokens extends string[],
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends "("
            ? LexExpression<[...Tokens, "("], Unscanned>
            : Char extends LiteralEnclosingChar
            ? LexLiteral<Char, "", Tokens, Unscanned>
            : LexNonLiteralTerminal<Char, Tokens, Unscanned>
        : ErrorToken<`Expected an expression.`>

    type LexNonLiteralTerminal<
        Fragment extends string,
        Tokens extends string[],
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends OperatorStarChar
            ? LexOperators<[...Tokens, Fragment], Chars>
            : LexNonLiteralTerminal<`${Fragment}${Char}`, Tokens, Unscanned>
        : [...Tokens, Fragment]

    type LexOperators<
        Tokens extends string[],
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends "?"
            ? Unscanned extends []
                ? [...Tokens, "?"]
                : ErrorToken<`Modifier '?' is only valid at the end of a type definition.`>
            : Char extends "["
            ? Unscanned extends Scan<"]", infer NextUnscanned>
                ? LexOperators<[...Tokens, "[]"], NextUnscanned>
                : ErrorToken<`Missing expected ']'.`>
            : Char extends BranchingOperatorToken
            ? LexExpression<[...Tokens, Char], Unscanned>
            : Char extends ComparatorStartChar
            ? LexBound<Char, Tokens, Unscanned>
            : Char extends ")"
            ? LexOperators<[...Tokens, Char], Unscanned>
            : Char extends " "
            ? LexOperators<Tokens, Unscanned>
            : Terminal.Error<`Expected an operator (got ${Char}).`>
        : Tokens

    type LexBound<
        FirstChar extends ComparatorStartChar,
        Tokens extends string[],
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends "="
            ? LexExpression<[...Tokens, `${FirstChar}=`], Unscanned>
            : FirstChar extends "="
            ? ErrorToken<`= is not a valid comparator. Use == instead.`>
            : LexExpression<
                  [...Tokens, FirstChar],
                  // Use Chars here instead of Unscanned since the comparator was only 1 character
                  Chars
              >
        : ErrorToken<`Expected a bound condition after ${FirstChar}.`>

    type ComparatorStartChar = "<" | ">" | "="

    type OperatorStarChar =
        | "["
        | "?"
        | BranchingOperatorToken
        | ComparatorStartChar

    type LiteralEnclosingChar = `'` | `"` | `/`

    type LexLiteral<
        Enclosing extends LiteralEnclosingChar,
        Contents extends string,
        Tokens extends string[],
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends Enclosing
            ? LexOperators<
                  [...Tokens, `${Enclosing}${Contents}${Enclosing}`],
                  Unscanned
              >
            : LexLiteral<Enclosing, `${Contents}${Char}`, Tokens, Unscanned>
        : ErrorToken<`Expected a closing ${Enclosing} token for literal expression ${Enclosing}${Contents}`>

    type ErrorToken<Message extends string> = ["ERROR", Message]

    /** An Expression is a list of tokens that must form a completed type to be valid */
    type ParseExpression<
        Tokens extends string[],
        Dict
    > = Tokens extends Iterate<infer Token, infer RemainingTokens>
        ? Token extends "("
            ? ParseGroup<SplitByMatchingParen<RemainingTokens, [], []>, Dict>
            : Token extends ")"
            ? Terminal.Error<"Unexpected ).">
            : Token extends OperatorToken
            ? Terminal.Error<`Expression expected (got ${Token}).`>
            : ParseOperators<RemainingTokens, ParseTerminal<Token, Dict>, Dict>
        : Terminal.Error<`Expected an expression.`>

    /** Operators are a list of zero or more tokens that modify or branch an Expression (Tree) */
    type ParseOperators<
        Tokens extends string[],
        Tree,
        Dict
    > = Tokens extends Iterate<infer Token, infer RemainingTokens>
        ? Token extends ModifyingToken
            ? ParseOperators<RemainingTokens, [Tree, Token], Dict>
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

    type ParseBound<
        Comparator extends ComparatorToken,
        Tokens extends string[],
        Tree,
        Dict
    > = Tokens extends Iterate<infer Token, infer Remaining>
        ? Token extends EmbeddedNumber.Definition
            ? AssertBoundableThen<Tree, ParseOperators<Remaining, Tree, Dict>>
            : Tree extends Terminal.DefinedFrom<EmbeddedNumber.Definition>
            ? ParseExpression<Tokens, Dict>
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
        ? ParseOperators<
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
    > = Tokens extends Iterate<infer Token, infer RemainingTokens>
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

    type ParseTerminal<Token extends string, Dict> = TypeToTerminal<
        Token,
        TypeOfTerminal<Token, Dict>
    >

    type TypeToTerminal<
        Token extends string,
        TerminalType
    > = IsResolvable<TerminalType> extends true
        ? Terminal.Typed<TerminalType, Token>
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
        export type Any = Record<string, unknown>

        export type Typed<
            Type,
            Def extends string,
            Error extends string | undefined = undefined
        > = {
            type: Type
            def: Def
            error: Error
        }

        export type DefinedFrom<Def extends string> = Typed<
            unknown,
            Def,
            undefined
        >

        export type Error<Message extends string> = Typed<
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
