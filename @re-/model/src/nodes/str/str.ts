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
        ? IsResolvableName<Child, Dict> extends true
            ? [Child, "[]"]
            : ParseDefinition<Def, Dict>
        : IsResolvableName<Def, Dict> extends true
        ? Def
        : ParseDefinition<Def, Dict>

    type ResolvableName<Dict> = Keyword.Definition | AliasIn<Dict>

    type IsResolvableName<
        Def extends string,
        Dict
    > = Def extends ResolvableName<Dict> ? true : false

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

    namespace State {
        export type Base = {
            left: {
                expression: ExpressionTree
                branches: ExpressionTree[]
            }
            right: string[]
        }

        export type From<S extends Base> = S

        export type Initialize<Unscanned extends string[]> = From<{
            left: {
                expression: []
                branches: []
            }
            right: Unscanned
        }>

        export type ScanTo<S extends Base, Unscanned extends string[]> = From<{
            left: S["left"]
            right: Unscanned
        }>

        export type SetExpression<
            S extends Base,
            Expression extends ExpressionTree,
            Unscanned extends string[] = S["right"]
        > = From<{
            left: {
                expression: Expression
                branches: S["left"]["branches"]
            }
            right: Unscanned
        }>

        export type PushToken<
            S extends Base,
            Token extends string,
            Unscanned extends string[] = S["right"]
        > = From<{
            left: {
                expression: [S["left"]["expression"], Token]
                branches: S["left"]["branches"]
            }
            right: Unscanned
        }>

        export type PushError<
            S extends Base,
            Message extends string,
            Unscanned extends string[] = S["right"]
        > = From<{
            left: {
                expression: S["left"]["expression"] extends string[]
                    ? [...S["left"]["expression"], ErrorToken<Message>]
                    : ErrorToken<Message>
                branches: S["left"]["branches"]
            }
            right: Unscanned
        }>

        export type PushBranch<
            S extends Base,
            Token extends BranchingOperatorToken,
            Unscanned extends string[] = S["right"]
        > = From<{
            left: {
                expression: []
                branches: [
                    ...S["left"]["branches"],
                    S["left"]["expression"],
                    Token
                ]
            }
            right: Unscanned
        }>

        export type PushGroup<
            S extends Base,
            Unscanned extends string[]
        > = State.From<{
            left: {
                expression: [...S["left"]["branches"], S["left"]["expression"]]
                branches: []
            }
            right: Unscanned
        }>

        export type Finalize<S extends Base> = S["left"]["branches"] extends []
            ? S["left"]["expression"]
            : [...S["left"]["branches"], S["left"]["expression"]]
    }

    type ParseDefinition<Def extends string, Dict> = State.Finalize<
        ShiftExpression<State.Initialize<ListChars<Def>>, Dict>
    >

    type ShiftExpression<S extends State.Base, Dict> = ShiftOperators<
        ShiftBase<S, Dict>,
        Dict
    >

    type ShiftBase<S extends State.Base, Dict> = S["right"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "("
            ? ShiftBase<State.Initialize<Unscanned>, Dict>
            : Lookahead extends LiteralEnclosingChar
            ? ShiftLiteral<Lookahead, "", State.ScanTo<S, Unscanned>, Dict>
            : Lookahead extends " "
            ? ShiftBase<State.ScanTo<S, Unscanned>, Dict>
            : ShiftFragment<Lookahead, State.ScanTo<S, Unscanned>, Dict>
        : State.PushError<S, `Expected an expression.`>

    type ShiftLiteral<
        EnclosedBy extends LiteralEnclosingChar,
        Contents extends string,
        S extends State.Base,
        Dict
    > = S["right"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends EnclosedBy
            ? State.SetExpression<
                  S,
                  `${EnclosedBy}${Contents}${EnclosedBy}`,
                  Unscanned
              >
            : ShiftLiteral<
                  EnclosedBy,
                  `${Contents}${Lookahead}`,
                  State.ScanTo<S, Unscanned>,
                  Dict
              >
        : State.PushError<
              S,
              `Expected a closing ${EnclosedBy} token for literal expression ${EnclosedBy}${Contents}`
          >

    type ShiftFragment<
        Fragment extends string,
        S extends State.Base,
        Dict
    > = S["right"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends OperatorStartChar
            ? State.SetExpression<S, ValidateFragment<Fragment, Dict>>
            : ShiftFragment<
                  `${Fragment}${Lookahead}`,
                  State.ScanTo<S, Unscanned>,
                  Dict
              >
        : State.SetExpression<S, ValidateFragment<Fragment, Dict>>

    type ValidateFragment<Fragment extends string, Dict> = IsResolvableName<
        Fragment,
        Dict
    > extends true
        ? Fragment
        : Fragment extends EmbeddedNumber.Definition | EmbeddedBigInt.Definition
        ? Fragment
        : ErrorToken<`'${Fragment}' does not exist in your space.`>

    type ExpressionTree = string | ExpressionTree[]

    type ShiftOperators<S extends State.Base, Dict> = S["right"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "["
            ? Unscanned extends Scan<"]", infer NextUnscanned>
                ? ShiftOperators<State.PushToken<S, "[]", NextUnscanned>, Dict>
                : State.PushError<S, `Missing expected ']'.`, Unscanned>
            : Lookahead extends BranchingOperatorToken
            ? ShiftBase<State.PushBranch<S, Lookahead, Unscanned>, Dict>
            : Lookahead extends ComparatorStartChar
            ? ShiftBound<Lookahead, State.ScanTo<S, Unscanned>, Dict>
            : Lookahead extends ")"
            ? State.PushGroup<S, Unscanned>
            : Lookahead extends " "
            ? ShiftOperators<State.ScanTo<S, Unscanned>, Dict>
            : Lookahead extends "?"
            ? State.PushError<
                  S,
                  `Modifier '?' is only valid at the end of a type definition.`,
                  Unscanned
              >
            : State.PushError<
                  S,
                  `Expected an operator (got ${Lookahead}).`,
                  Unscanned
              >
        : S

    type ShiftBound<
        FirstChar extends ComparatorStartChar,
        S extends State.Base,
        Dict
    > = S["right"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends "="
            ? ReduceBound<
                  S,
                  `${FirstChar}=`,
                  ShiftBase<State.SetExpression<S, "", Unscanned>, Dict>
              >
            : FirstChar extends "="
            ? State.PushError<S, `= is not a valid comparator. Use == instead.`>
            : ReduceBound<
                  S,
                  // @ts-expect-error
                  FirstChar,
                  ShiftBase<State.SetExpression<S, "">, Dict>
              >
        : State.PushError<S, `Expected a bound condition after ${FirstChar}.`>

    type ReduceBound<
        S extends State.Base,
        Comparator extends ComparatorToken,
        Next extends State.Base
    > = Next["left"]["expression"] extends EmbeddedNumber.Definition
        ? S["left"]["expression"] extends BoundableNode
            ? State.From<{
                  left: S["left"]
                  right: Next["right"]
              }>
            : State.PushToken<S, BoundabilityError>
        : S["left"]["expression"] extends EmbeddedNumber.Definition
        ? Next["left"]["expression"] extends BoundableNode
            ? Next
            : State.PushToken<S, BoundabilityError>
        : State.PushError<
              S,
              `One side of comparator ${Comparator} must be a number literal.`
          >

    type ComparatorStartChar = "<" | ">" | "="

    type OperatorStartChar =
        | ModifyingOperatorStartChar
        | BranchingOperatorToken
        | ComparatorStartChar
        | " "
        | ")"

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
