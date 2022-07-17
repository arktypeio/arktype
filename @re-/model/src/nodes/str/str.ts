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
        ? IsIdentifier<Child, Dict> extends true
            ? [Child, "[]"]
            : ParseExpression<ListChars<Def>, Dict>
        : IsIdentifier<Def, Dict> extends true
        ? Def
        : ParseExpression<ListChars<Def>, Dict>

    type Identifier<Dict> = Keyword.Definition | AliasIn<Dict>

    type IsIdentifier<Def extends string, Dict> = Def extends Identifier<Dict>
        ? true
        : false

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

    type Scan<Left extends string, Unscanned extends string[]> = [
        Left,
        ...Unscanned
    ]

    type ParseExpression<
        Unscanned extends string[],
        Dict
    > = Unscanned extends Scan<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends "("
            ? ShiftGroup<NextUnscanned, [], [], Dict>
            : Lookahead extends LiteralEnclosingChar
            ? ShiftLiteral<Lookahead, "", NextUnscanned, Dict>
            : Lookahead extends " "
            ? ParseExpression<NextUnscanned, Dict>
            : ShiftFragment<Lookahead, NextUnscanned, Dict>
        : ErrorToken<`Expected an expression.`>

    type ShiftLiteral<
        EnclosedBy extends LiteralEnclosingChar,
        Contents extends string,
        Unscanned extends string[],
        Dict
    > = Unscanned extends Scan<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends EnclosedBy
            ? ShiftOperators<
                  `${EnclosedBy}${Contents}${EnclosedBy}`,
                  NextUnscanned,
                  Dict
              >
            : ShiftLiteral<
                  EnclosedBy,
                  `${Contents}${Lookahead}`,
                  NextUnscanned,
                  Dict
              >
        : ErrorToken<`Expected a closing ${EnclosedBy} token for literal expression ${EnclosedBy}${Contents}`>

    type ShiftFragment<
        Fragment extends string,
        Unscanned extends string[],
        Dict
    > = Unscanned extends Scan<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends OperatorStartChar
            ? ShiftOperators<ValidateFragment<Fragment, Dict>, Unscanned, Dict>
            : ShiftFragment<`${Fragment}${Lookahead}`, NextUnscanned, Dict>
        : ValidateFragment<Fragment, Dict>

    type ValidateFragment<Fragment extends string, Dict> = IsIdentifier<
        Fragment,
        Dict
    > extends true
        ? Fragment
        : Fragment extends EmbeddedNumber.Definition | EmbeddedBigInt.Definition
        ? Fragment
        : ErrorToken<`'${Fragment}' does not exist in your space.`>

    type ExpressionTree = string | ExpressionTree[]

    type ShiftOperators<
        Tree extends ExpressionTree,
        Unscanned extends string[],
        Dict
    > = Unscanned extends Scan<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends "["
            ? NextUnscanned extends Scan<"]", infer NextNextUnscanned>
                ? ShiftOperators<[Tree, "[]"], NextNextUnscanned, Dict>
                : ErrorToken<`Missing expected ']'.`>
            : Lookahead extends BranchingOperatorToken
            ? [Tree, Lookahead, ParseExpression<NextUnscanned, Dict>]
            : Lookahead extends ComparatorStartChar
            ? ShiftBound<Tree, Lookahead, NextUnscanned, Dict>
            : Lookahead extends " "
            ? ShiftOperators<Tree, NextUnscanned, Dict>
            : Lookahead extends "?"
            ? ErrorToken<`Modifier '?' is only valid at the end of a type definition.`>
            : ErrorToken<`Expected an operator (got ${Lookahead}).`>
        : Tree

    type ShiftGroup<
        Unscanned extends string[],
        Scanned extends string[],
        Depth extends unknown[],
        Dict
    > = Unscanned extends Scan<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends "("
            ? ShiftGroup<
                  NextUnscanned,
                  [...Scanned, Lookahead],
                  [...Depth, 1],
                  Dict
              >
            : Lookahead extends ")"
            ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
              Depth extends [...infer DepthMinusOne, infer Pop]
                ? ShiftGroup<
                      NextUnscanned,
                      [...Scanned, Lookahead],
                      DepthMinusOne,
                      Dict
                  >
                : ShiftOperators<
                      ParseExpression<Scanned, Dict>,
                      NextUnscanned,
                      Dict
                  >
            : ShiftGroup<NextUnscanned, [...Scanned, Lookahead], Depth, Dict>
        : ErrorToken<"Missing ).">

    type ShiftBound<
        Tree extends ExpressionTree,
        FirstChar extends ComparatorStartChar,
        Unscanned extends string[],
        Dict
    > = Unscanned extends Scan<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends "="
            ? ReduceBound<
                  Tree,
                  `${FirstChar}=`,
                  ParseExpression<NextUnscanned, Dict>
              >
            : FirstChar extends "="
            ? ErrorToken<`= is not a valid comparator. Use == instead.`>
            : ReduceBound<
                  Tree,
                  // @ts-expect-error
                  FirstChar,
                  // Use Unscanned here instead of NextUnscanned since the comparator was only 1 character
                  ParseExpression<Unscanned, Dict>
              >
        : ErrorToken<`Expected a bound condition after ${FirstChar}.`>

    type ReduceBound<
        Left extends ExpressionTree,
        Comparator extends ComparatorToken,
        Right extends ExpressionTree
    > = Right extends EmbeddedNumber.Definition
        ? Left extends BoundableNode
            ? Left
            : BoundabilityError
        : Left extends EmbeddedNumber.Definition
        ? Right extends BoundableNode
            ? Right
            : BoundabilityError
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

    type BoundabilityError =
        ErrorToken<`Bounded expression must be a numbed-or-string-typed keyword or a list-typed expression.`>

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
