import { Get, ListChars } from "@re-/tools"
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
        Parse<Def, Dict>
    >

    type LeavesOf<Tree> = Tree extends [infer Child, string]
        ? LeavesOf<Child>
        : Tree extends [infer Left, string, infer Right]
        ? [...LeavesOf<Right>, ...LeavesOf<Left>]
        : [Tree]

    type ComparatorToken = "<" | ">" | "<=" | ">=" | "=="

    type Scan<Left extends string, Unscanned extends string[]> = [
        Left,
        ...Unscanned
    ]

    namespace State {
        export type State = {
            l: Left
            r: string[]
        }

        export type Left = {
            top: ExpressionTree
            groups: ExpressionTree[]
        }

        export type PushBase<
            S extends State,
            Token extends string,
            Unscanned extends string[]
        > = From<{
            l: {
                top: Token
                groups: S["l"]["groups"]
            }
            r: Unscanned
        }>

        export type PushTransform<
            S extends State,
            Token extends string,
            Unscanned extends string[]
        > = From<{
            l: {
                top: [S["l"]["top"], Token]
                groups: S["l"]["groups"]
            }
            r: Unscanned
        }>

        type Pop<Stack extends ExpressionTree[], Top extends ExpressionTree> = [
            ...Stack,
            Top
        ]

        type PushOrSet<
            Stack extends unknown[],
            Node extends unknown[]
        > = Stack extends [] ? Node : [Stack, ...Node]

        export type ScanTo<S extends State, Unscanned extends string[]> = From<{
            l: S["l"]
            r: Unscanned
        }>

        export type PushBranch<
            S extends State,
            Token extends string,
            Unscanned extends string[]
        > = From<{
            l: {
                top: ""
                groups: S["l"]["groups"] extends []
                    ? [S["l"]["top"], Token]
                    : [[...S["l"]["groups"], S["l"]["top"]], Token]
            }
            r: Unscanned
        }>

        export type Finalize<S extends State> = From<{
            l: {
                top: S["l"]["groups"] extends []
                    ? S["l"]["top"]
                    : [...S["l"]["groups"], S["l"]["top"]]
                groups: []
            }
            r: S["r"]
        }>

        export type PushError<
            S extends State,
            Message extends string,
            Unscanned extends string[]
        > = PushBase<S, ErrorToken<Message>, Unscanned>

        export type From<S extends State> = S

        export type Initialize<Def extends string> = {
            l: {
                top: ""
                groups: []
            }
            r: ListChars<Def>
        }
    }

    type ParseDefinition<Def extends string, Dict> = State.Finalize<
        ShiftDefinition<Def, Dict>
    >["l"]["top"]

    type ShiftDefinition<Def extends string, Dict> = ShiftBranch<
        State.Initialize<Def>,
        Dict
    >

    type FOO = ParseDefinition<"string", {}>

    // type ShiftExpression<
    //     S extends State.State,
    //     Dict
    // > = S["r"]["token"] extends ExpressionTerminatingChar
    //     ? S
    //     : S["r"]["token"] extends "|" | "&"
    //     ? ShiftExpression<ShiftBranch<State.PushBranch<S>, Dict>, Dict>
    //     : State.PushError<S, `Unexpected token ${S["r"]["token"]}.`>

    type ShiftBranch<S extends State.State, Dict> = ShiftOperators<
        ShiftBase<S, Dict>,
        Dict
    >

    type ShiftBase<S extends State.State, Dict> = S["r"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends LiteralEnclosingChar
            ? ShiftLiteral<State.ScanTo<S, Unscanned>, Lookahead, Lookahead>
            : ShiftNonLiteral<S, "", Dict>
        : State.PushError<S, `Expected an expression.`, []>

    type ShiftLiteral<
        S extends State.State,
        FirstChar extends LiteralEnclosingChar,
        Token extends string
    > = S["r"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends FirstChar
            ? State.PushBase<S, `${Token}${Lookahead}`, Unscanned>
            : ShiftLiteral<
                  State.ScanTo<S, Unscanned>,
                  FirstChar,
                  `${Token}${Lookahead}`
              >
        : State.PushError<S, `${Token} requires a closing ${FirstChar}.`, []>

    type ShiftNonLiteral<
        S extends State.State,
        Token extends string,
        Dict
    > = S["r"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends BaseTerminatingChar
            ? State.PushBase<S, ValidateNonLiteral<Token, Dict>, S["r"]>
            : ShiftNonLiteral<
                  State.ScanTo<S, Unscanned>,
                  `${Token}${Lookahead}`,
                  Dict
              >
        : State.PushBase<S, ValidateNonLiteral<Token, Dict>, []>

    type ValidateNonLiteral<Token extends string, Dict> = IsResolvableName<
        Token,
        Dict
    > extends true
        ? Token
        : Token extends EmbeddedNumber.Definition | EmbeddedBigInt.Definition
        ? Token
        : ErrorToken<`'${Token}' does not exist in your space.`>

    type ShiftOperators<S extends State.State, Dict> = S["r"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "|" | "&"
            ? ShiftBranch<State.PushBranch<S, Lookahead, Unscanned>, Dict>
            : Lookahead extends ")"
            ? S
            : ShiftOperators<
                  Lookahead extends "["
                      ? ShiftListToken<State.ScanTo<S, Unscanned>>
                      : Lookahead extends " "
                      ? State.ScanTo<S, Unscanned>
                      : Lookahead extends "?"
                      ? State.PushError<
                            S,
                            `Modifier '?' is only valid at the end of a definition.`,
                            Unscanned
                        >
                      : State.PushError<
                            S,
                            `Invalid operator ${Lookahead}.`,
                            Unscanned
                        >,
                  Dict
              >
        : S

    type ShiftListToken<S extends State.State> = S["r"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "]"
            ? State.PushTransform<S, "[]", Unscanned>
            : State.PushError<S, `Missing expected ']'.`, []>
        : State.PushError<S, `Missing expected ']'.`, []>

    type ExpressionTree = string | ExpressionTree[]

    type ComparatorStartChar = "<" | ">" | "="

    type BaseTerminatingChar = "[" | " " | "?" | BranchTerminatingChar

    type BranchTerminatingChar =
        | "|"
        | "&"
        | ExpressionTerminatingChar
        | ComparatorStartChar

    type ExpressionTerminatingChar = "END" | ")"

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
