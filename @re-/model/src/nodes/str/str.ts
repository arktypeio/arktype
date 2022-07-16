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
    export type Parse<Def extends string, Dict> = Def extends `${infer Child}?`
        ? [TryNaiveParse<Child, Dict>, "?"]
        : TryNaiveParse<Def, Dict>

    type TryNaiveParse<
        Def extends string,
        Dict
    > = Def extends `${infer Child}[]`
        ? IsTrivialTerminal<Child, Dict> extends true
            ? [Child, "[]"]
            : ParseExpression<ListChars<Def>, Dict>
        : IsTrivialTerminal<Def, Dict> extends true
        ? Def
        : ParseExpression<ListChars<Def>, Dict>

    type TrivialTerminal<Dict> =
        | Keyword.Definition
        | AliasIn<Dict>
        | EmbeddedNumber.Definition
        | EmbeddedBigInt.Definition

    type IsTrivialTerminal<
        Def extends string,
        Dict
    > = Def extends TrivialTerminal<Dict> ? true : false

    export type Validate<Def extends string, Dict> = IfDefined<
        ValidateTree<Parse<Def, Dict>>,
        Def
    >

    type IfDefined<T, Fallback> = T extends undefined ? Fallback : T

    type Iterate<Current, Remaining extends unknown[]> = [Current, ...Remaining]

    export type TypeOf<Def extends string, Dict, Seen> = TypeOfTree<
        Parse<Def, Dict>,
        Dict,
        Seen
    >

    type TypeOfTree<Tree, Dict, Seen> = Tree extends string
        ? TypeOfTerminal<Tree, Dict, Seen>
        : Tree extends [infer Next, "?"]
        ? TypeOfTree<Next, Dict, Seen> | undefined
        : Tree extends [infer Next, "[]"]
        ? TypeOfTree<Next, Dict, Seen>[]
        : Tree extends [infer Left, "|", infer Right]
        ? TypeOfTree<Left, Dict, Seen> | TypeOfTree<Right, Dict, Seen>
        : Tree extends [infer Left, "&", infer Right]
        ? TypeOfTree<Left, Dict, Seen> & TypeOfTree<Right, Dict, Seen>
        : unknown

    type ValidateTree<Tree> = Tree extends string
        ? Tree extends ErrorToken<infer Message>
            ? Message
            : undefined
        : Tree extends Iterate<infer Node, infer Remaining>
        ? IfDefined<ValidateTree<Node>, ValidateTree<Remaining>>
        : undefined

    export type References<Def extends string, Dict> = LeavesOf<
        Parse<Def, Dict>,
        []
    >

    type LeavesOf<Tree, Leaves extends string[]> = Tree extends string
        ? [...Leaves, Tree]
        : Tree extends [infer Child, string]
        ? LeavesOf<Child, Leaves>
        : Tree extends [infer Left, string, infer Right]
        ? LeavesOf<Right, LeavesOf<Left, Leaves>>
        : Leaves

    type ComparatorToken = "<" | ">" | "<=" | ">=" | "=="

    type Scan<Next extends string, Unscanned extends string[]> = [
        Next,
        ...Unscanned
    ]

    type ParseTree = string | ParseTree[]

    /** An Expression is a list of tokens that must form a completed type to be valid */
    type ParseExpression<Chars extends string[], Dict> = Chars extends Scan<
        infer Char,
        infer Unscanned
    >
        ? Char extends "("
            ? ParseGroup<SplitByMatchingParen<Unscanned, [], []>, Dict>
            : Char extends LiteralEnclosingChar
            ? ParseLiteral<Char, "", Unscanned, Dict>
            : Char extends " "
            ? ParseExpression<Unscanned, Dict>
            : ParseFragment<Char, Unscanned, Dict>
        : ErrorToken<`Expected an expression.`>

    type ParseGroup<
        SlicedChars extends [string[], string[]],
        Dict
    > = ParseOperators<
        ParseExpression<SlicedChars[0], Dict>,
        SlicedChars[1],
        Dict
    >

    type ParseLiteral<
        Enclosing extends LiteralEnclosingChar,
        Contents extends string,
        Chars extends string[],
        Dict
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends Enclosing
            ? ParseOperators<
                  `${Enclosing}${Contents}${Enclosing}`,
                  Unscanned,
                  Dict
              >
            : ParseLiteral<Enclosing, `${Contents}${Char}`, Unscanned, Dict>
        : ErrorToken<`Expected a closing ${Enclosing} token for literal expression ${Enclosing}${Contents}`>

    type ParseFragment<
        Fragment extends string,
        Chars extends string[],
        Dict
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends OperatorStartChar
            ? ParseOperators<ValidateFragment<Fragment, Dict>, Chars, Dict>
            : ParseFragment<`${Fragment}${Char}`, Unscanned, Dict>
        : ValidateFragment<Fragment, Dict>

    type ValidateFragment<Fragment extends string, Dict> = IsTrivialTerminal<
        Fragment,
        Dict
    > extends true
        ? Fragment
        : ErrorToken<`'${Fragment}' does not exist in your space.`>

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
        Tree extends ParseTree,
        Chars extends string[],
        Dict
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends "["
            ? Unscanned extends Scan<"]", infer NextUnscanned>
                ? ParseOperators<[Tree, "[]"], NextUnscanned, Dict>
                : ErrorToken<`Missing expected ']'.`>
            : Char extends BranchingOperatorToken
            ? [Tree, Char, ParseExpression<Unscanned, Dict>]
            : Char extends ComparatorStartChar
            ? ShiftBound<Char, Unscanned, Tree, Dict>
            : Char extends " "
            ? ParseOperators<Tree, Unscanned, Dict>
            : Char extends "?"
            ? ErrorToken<`Modifier '?' is only valid at the end of a type definition.`>
            : ErrorToken<`Expected an operator (got ${Char}).`>
        : Tree

    type ShiftBound<
        FirstChar extends ComparatorStartChar,
        Chars extends string[],
        Tree extends ParseTree,
        Dict
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends "="
            ? ReduceBound<Tree, `${FirstChar}=`, Unscanned, Dict>
            : FirstChar extends "="
            ? ErrorToken<`= is not a valid comparator. Use == instead.`>
            : // Use Chars here instead of Unscanned since the comparator was only 1 character
              // @ts-expect-error
              ReduceBound<Tree, FirstChar, Chars, Dict>
        : ErrorToken<`Expected a bound condition after ${FirstChar}.`>

    type ReduceBound<
        Tree extends ParseTree,
        Comparator extends ComparatorToken,
        Chars extends string[],
        Dict
    > = Lex<"", Chars> extends [EmbeddedNumber.Definition, infer Unscanned]
        ? // @ts-expect-error
          AssertBoundableThen<Tree, ParseOperators<Tree, Unscanned, Dict>>
        : Tree extends EmbeddedNumber.Definition
        ? AssertBoundableThen<
              ParseExpression<Chars, Dict>,
              ParseExpression<Chars, Dict>
          >
        : ErrorToken<`One side of comparator ${Comparator} must be a number literal.`>

    type ComparatorStartChar = "<" | ">" | "="

    type OperatorStartChar =
        | ModifyingOperatorStartChar
        | BranchingOperatorToken
        | ComparatorStartChar
        | " "

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
    type ModifyingOperatorStartChar = "[" | "?"

    type LiteralEnclosingChar = `'` | `"` | `/`

    type ErrorToken<Message extends string> = `!${Message}`

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
        : ErrorToken<`Bounded expression must be a numbed-or-string-typed keyword or a list-typed expression.`>

    type SplitByMatchingParen<
        Chars extends string[],
        BeforeMatch extends string[],
        Depth extends unknown[]
    > = Chars extends Scan<infer Char, infer Unscanned>
        ? Char extends "("
            ? SplitByMatchingParen<
                  Unscanned,
                  [...BeforeMatch, Char],
                  [...Depth, 1]
              >
            : Char extends ")"
            ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
              Depth extends [...infer DepthMinusOne, infer Pop]
                ? SplitByMatchingParen<
                      Unscanned,
                      [...BeforeMatch, Char],
                      DepthMinusOne
                  >
                : [BeforeMatch, Unscanned]
            : SplitByMatchingParen<Unscanned, [...BeforeMatch, Char], Depth>
        : [[ErrorToken<"Missing ).">], []]

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
