import { ListChars } from "@re-/tools"
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
    export type Parse<Def extends string> = ParseExpression<ListChars<Def>>

    export type Validate<Def extends string, Dict> = IfDefined<
        ValidateParseTree<Parse<Def>, Dict>,
        Def
    >

    type IfDefined<T, Fallback> = T extends undefined ? Fallback : T

    type Coalesce<T extends unknown[]> = T extends Iterate<
        infer Current,
        infer Remaining
    >
        ? Current extends undefined
            ? Coalesce<Remaining>
            : Current
        : undefined

    type Iterate<Current, Remaining extends unknown[]> = [Current, ...Remaining]

    export type TypeOf<Def extends string, Dict, Seen> = TypeOfParseTree<
        Parse<Def>,
        Dict,
        Seen
    >

    // Consider adding type for tree?

    type ValidateParseTree<Tree, Dict> = Tree extends string
        ? ValidateTerminal<Tree, Dict>
        : Tree extends [infer Next, "?"]
        ? ValidateParseTree<Next, Dict>
        : Tree extends [infer Next, "[]"]
        ? ValidateParseTree<Next, Dict>
        : Tree extends [infer Left, "|", infer Right]
        ? Coalesce<
              [ValidateParseTree<Left, Dict>, ValidateParseTree<Right, Dict>]
          >
        : Tree extends [infer Left, "&", infer Right]
        ? Coalesce<
              [ValidateParseTree<Left, Dict>, ValidateParseTree<Right, Dict>]
          >
        : Tree extends ErrorToken<infer Message>
        ? Message
        : `Unexpected validation result.`

    type TypeOfParseTree<Tree, Dict, Seen> = Tree extends string
        ? TypeOfTerminal<Tree, Dict, Seen>
        : Tree extends [infer Next, "?"]
        ? TypeOfParseTree<Next, Dict, Seen> | undefined
        : Tree extends [infer Next, "[]"]
        ? TypeOfParseTree<Next, Dict, Seen>[]
        : Tree extends [infer Left, "|", infer Right]
        ? TypeOfParseTree<Left, Dict, Seen> | TypeOfParseTree<Right, Dict, Seen>
        : Tree extends [infer Left, "&", infer Right]
        ? TypeOfParseTree<Left, Dict, Seen> & TypeOfParseTree<Right, Dict, Seen>
        : unknown

    export type References<Def extends string> = ExtractReferences<
        Parse<Def>,
        []
    >

    type ExtractReferences<Tree, Refs extends string[]> = []

    type NonTerminalToken = "(" | ")" | OperatorToken

    type OperatorToken = "[]" | "?" | "|" | "&" | ComparatorToken

    type ComparatorToken = "<" | ">" | "<=" | ">=" | "=="

    type Scan<Char extends string, Unscanned extends string[]> = [
        Char,
        ...Unscanned
    ]

    type ParseTree = string | ParseTree[]

    /** An Expression is a list of tokens that must form a completed type to be valid */
    type ParseExpression<Chars extends string[]> = Chars extends Scan<
        infer Char,
        infer Unscanned
    >
        ? Char extends "("
            ? ParseGroup<SplitByMatchingParen<Unscanned, [], []>>
            : Char extends LiteralEnclosingChar
            ? ParseLiteral<Char, "", Unscanned>
            : ParseNonLiteralTerminal<Char, Unscanned>
        : ErrorToken<`Expected an expression.`>

    type ParseGroup<SlicedChars extends [string[], string[]]> = ParseOperators<
        [ParseExpression<SlicedChars[0]>],
        SlicedChars[1]
    >

    type ParseLiteral<
        Enclosing extends LiteralEnclosingChar,
        Contents extends string,
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends Enclosing
            ? ParseOperators<`${Enclosing}${Contents}${Enclosing}`, Unscanned>
            : ParseLiteral<Enclosing, `${Contents}${Char}`, Unscanned>
        : ErrorToken<`Expected a closing ${Enclosing} token for literal expression ${Enclosing}${Contents}`>

    type ParseNonLiteralTerminal<
        Fragment extends string,
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends OperatorStartChar
            ? ParseOperators<Fragment, Chars>
            : ParseNonLiteralTerminal<`${Fragment}${Char}`, Unscanned>
        : Fragment

    type Lex<
        Fragment extends string,
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends OperatorStartChar
            ? [Fragment, Chars]
            : Lex<`${Fragment}${Char}`, Unscanned>
        : [Fragment, Chars]

    /** Operators are a list of zero or more tokens that modify or branch an Expression (Tree) */
    type ParseOperators<
        Tokens extends ParseTree,
        Chars extends string[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends "?"
            ? Unscanned extends []
                ? [Tokens, "?"]
                : ErrorToken<`Modifier '?' is only valid at the end of a type definition.`>
            : Char extends "["
            ? Unscanned extends Scan<"]", infer NextUnscanned>
                ? ParseOperators<[Tokens, "[]"], NextUnscanned>
                : ErrorToken<`Missing expected ']'.`>
            : Char extends BranchingOperatorToken
            ? [Tokens, Char, ParseExpression<Unscanned>]
            : Char extends ComparatorStartChar
            ? ShiftBound<Char, Unscanned, Tokens>
            : Char extends " "
            ? ParseOperators<Tokens, Unscanned>
            : ErrorToken<`Expected an operator (got ${Char}).`>
        : Tokens

    type ShiftBound<
        FirstChar extends ComparatorStartChar,
        Chars extends string[],
        Tree extends ParseTree
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends "="
            ? ReduceBound<Tree, `${FirstChar}=`, Unscanned>
            : FirstChar extends "="
            ? ErrorToken<`= is not a valid comparator. Use == instead.`>
            : // Use Chars here instead of Unscanned since the comparator was only 1 character
              // @ts-expect-error
              ReduceBound<Tree, FirstChar, Chars>
        : ErrorToken<`Expected a bound condition after ${FirstChar}.`>

    type ReduceBound<
        Tree extends ParseTree,
        Comparator extends ComparatorToken,
        Chars extends string[]
    > = Lex<"", Chars> extends [EmbeddedNumber.Definition, infer Unscanned]
        ? // @ts-expect-error
          AssertBoundableThen<Tree, ParseOperators<Tree, Unscanned>>
        : Tree extends EmbeddedNumber.Definition
        ? AssertBoundableThen<ParseExpression<Chars>, ParseExpression<Chars>>
        : Terminal.Error<`One side of comparator ${Comparator} must be a number literal.`>

    type ComparatorStartChar = "<" | ">" | "="

    type OperatorStartChar =
        | "["
        | "?"
        | BranchingOperatorToken
        | ComparatorStartChar

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

    /** These tokens modify the current expression */
    type ModifyingToken = "[]" | "?"

    type LiteralEnclosingChar = `'` | `"` | `/`

    type ErrorToken<Message extends string> = ["ERROR", Message]

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanumeric" in "100>alphanumeric")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    type BoundableNode =
        | Keyword.OfTypeNumber
        | Keyword.OfTypeString
        | [unknown, "[]"]

    type AssertBoundableThen<Node, Next> = Node extends BoundableNode
        ? Next
        : Terminal.Error<`Bounded expression must be a numbed-or-string-typed keyword or a list-typed expression.`>

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
        : [ErrorToken<"Missing ).">, []]

    type ValidateTerminal<Token extends string, Dict> = Token extends
        | Keyword.Definition
        | AliasIn<Dict>
        | `'${string}'`
        | `"${string}"`
        | `/${string}/`
        | EmbeddedNumber.Definition
        | EmbeddedBigInt.Definition
        ? undefined
        : `'${Token}' does not exist in your space.`

    type TypeOfTerminal<
        Token extends string,
        Dict,
        Seen
    > = Token extends Keyword.Definition
        ? Keyword.Types[Token]
        : Token extends AliasIn<Dict>
        ? Alias.TypeOf<Token, Dict, Seen>
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
        : unknown

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
