import { ListChars } from "@re-/tools"
import { Base } from "../base/index.js"
import {
    BigintLiteral,
    NumberLiteral,
    RegexLiteral,
    StringLiteral
} from "./literal.js"
import { ListNode } from "./nonTerminal/list.js"
import { OptionalNode } from "./nonTerminal/optional.js"
import { Parser } from "./parse.js"
import { AliasNode, AliasType } from "./terminal/alias.js"
import { Keyword } from "./terminal/keyword/keyword.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = TryNaiveParse<Def, Dict>

    /**
     * Try to parse the definition from right to left using the most common syntax.
     * This can be much more efficient for simple definitions. Unfortunately,
     * parsing from right to left makes maintaining a tree that can either be returned
     * or discarded in favor of a full parse tree much more costly.
     *
     * Hence, this repetitive (but efficient) shallow parse that decides whether to
     * delegate parsing in a single pass.
     */
    type TryNaiveParse<Def extends string, Dict> = Def extends `${infer Child}?`
        ? Child extends `${infer Item}[]`
            ? IsResolvableName<Item, Dict> extends true
                ? [[Item, "[]"], "?"]
                : ParseDefinition<Def, Dict>
            : IsResolvableName<Child, Dict> extends true
            ? [Child, "?"]
            : ParseDefinition<Def, Dict>
        : Def extends `${infer Child}[]`
        ? IsResolvableName<Child, Dict> extends true
            ? [Child, "[]"]
            : ParseDefinition<Def, Dict>
        : IsResolvableName<Def, Dict> extends true
        ? Def
        : ParseDefinition<Def, Dict>

    type IsResolvableName<
        Def extends string,
        Dict
    > = Def extends Keyword.Definition
        ? true
        : Def extends keyof Dict
        ? true
        : false

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends ErrorToken<infer Message>
        ? Message
        : Def

    export type Infer<
        Def extends string,
        Ctx extends Base.Parsing.InferenceContext
    > = InferTree<Parse<Def, Ctx["dict"]>, Ctx>

    type InferTree<
        Tree,
        Ctx extends Base.Parsing.InferenceContext
    > = Tree extends string
        ? InferTerminal<Tree, Ctx>
        : Tree extends [infer Next, "?"]
        ? InferTree<Next, Ctx> | undefined
        : Tree extends [infer Next, "[]"]
        ? InferTree<Next, Ctx>[]
        : Tree extends [infer Left, "|", infer Right]
        ? InferTree<Left, Ctx> | InferTree<Right, Ctx>
        : Tree extends [infer Left, "&", infer Right]
        ? InferTree<Left, Ctx> & InferTree<Right, Ctx>
        : unknown

    export type References<Def extends string, Dict> = LeavesOf<
        Parse<Def, Dict>
    >

    type LeavesOf<Tree> = Tree extends [infer Child, string]
        ? LeavesOf<Child>
        : Tree extends [infer Left, string, infer Right]
        ? [...LeavesOf<Right>, ...LeavesOf<Left>]
        : [Tree]

    type Scan<Left extends string, Unscanned extends string[]> = [
        Left,
        ...Unscanned
    ]

    type TransformedNode<Child, Token extends string> = [Child, Token]

    type BranchNode<Left, Token extends string, Right> = [Left, Token, Right]

    type TreeToString<Tree> = Tree extends string
        ? Tree
        : Tree extends TransformedNode<infer Child, infer Token>
        ? `${TreeToString<Child>}${Token}`
        : Tree extends BranchNode<infer Left, infer Token, infer Right>
        ? `${TreeToString<Left>}${Token}${TreeToString<Right>}`
        : ""

    export namespace State {
        export type State = {
            openGroups: BranchState[]
            branch: BranchState
            expression: unknown
            unscanned: string[]
        }

        export type Initialize<Def extends string> = From<{
            openGroups: []
            branch: DefaultBranchState
            expression: []
            unscanned: ListChars<Def>
        }>

        export type BranchState = {
            union: CurrentBranch
            intersection: CurrentBranch
            ctx: BranchContext
        }

        type DefaultBranchState = {
            union: []
            intersection: []
            ctx: {}
        }

        export type CurrentBranch = [] | [unknown, string]

        export type BranchContext = {
            leftBounded?: boolean
            rightBounded?: boolean
        }

        export type ScanTo<S extends State, Unscanned extends string[]> = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: S["expression"]
            unscanned: Unscanned
        }>

        export type UpdateBranchContext<
            S extends State,
            Updates extends Partial<BranchContext>
        > = From<{
            openGroups: S["openGroups"]
            branch: S["branch"] & { ctx: Updates }
            expression: S["expression"]
            unscanned: S["unscanned"]
        }>

        export type PushBase<
            S extends State,
            Token extends string,
            Unscanned extends string[]
        > = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: Token
            unscanned: Unscanned
        }>

        type PushIntersection<B extends BranchState, Expression> = {
            union: B["union"]
            intersection: [
                B["intersection"] extends []
                    ? Expression
                    : [...B["intersection"], Expression],
                "&"
            ]
            ctx: B["ctx"]
        }

        type PushUnion<B extends BranchState, Expression> = {
            union: [
                B["union"] extends []
                    ? MergeExpression<B["intersection"], Expression>
                    : [
                          ...B["union"],
                          MergeExpression<B["intersection"], Expression>
                      ],
                "|"
            ]
            intersection: []
            ctx: {}
        }

        export type PushBranchingToken<
            S extends State,
            Token extends BranchingOperatorToken,
            Unscanned extends string[]
        > = From<{
            openGroups: S["openGroups"]
            branch: Token extends "|"
                ? PushUnion<S["branch"], S["expression"]>
                : PushIntersection<S["branch"], S["expression"]>
            expression: []
            unscanned: Unscanned
        }>

        type ExtractIfSingleton<T> = T extends [infer Element] ? Element : T

        type MergeExpression<
            Branch extends CurrentBranch,
            Expression
        > = ExtractIfSingleton<[...Branch, Expression]>

        type MergeBranches<B extends BranchState, Expression> = MergeExpression<
            B["union"],
            MergeExpression<B["intersection"], Expression>
        >

        export type Finalize<S extends State> = S["openGroups"] extends []
            ? From<{
                  openGroups: []
                  branch: DefaultBranchState
                  expression: MergeBranches<S["branch"], S["expression"]>
                  unscanned: []
              }>
            : Error<`Missing ).`>

        export type PushTransform<
            S extends State,
            Token extends string,
            Unscanned extends string[]
        > = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: [S["expression"], Token]
            unscanned: Unscanned
        }>

        export type OpenGroup<
            S extends State,
            Unscanned extends string[]
        > = From<{
            openGroups: [...S["openGroups"], S["branch"]]
            branch: DefaultBranchState
            expression: []
            unscanned: Unscanned
        }>

        type PopGroup<Stack extends BranchState[], Top extends BranchState> = [
            ...Stack,
            Top
        ]

        export type CloseGroup<
            S extends State,
            Unscanned extends string[]
        > = S["openGroups"] extends PopGroup<infer Stack, infer Top>
            ? From<{
                  openGroups: Stack
                  branch: Top
                  expression: MergeBranches<S["branch"], S["expression"]>
                  unscanned: Unscanned
              }>
            : Error<`Unexpected ).`>

        export type Error<Message extends string> = From<{
            openGroups: []
            branch: DefaultBranchState
            expression: ErrorToken<Message>
            unscanned: []
        }>

        export type From<S extends State> = S
    }

    type ParseDefinition<Def extends string, Dict> = ShiftDefinition<
        Def,
        Dict
    >["expression"]

    type ShiftDefinition<Def extends string, Dict> = ShiftExpression<
        State.Initialize<Def>,
        Dict
    >

    /**
     * We start by shifting the first branch before looping via ShiftBranches
     * in order to ensure we error on an empty expression like "" or "()".
     */
    type ShiftExpression<S extends State.State, Dict> = ShiftBranches<
        ShiftBranch<S, Dict>,
        Dict
    >

    type ShiftBranches<
        S extends State.State,
        Dict
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends "?"
            ? Unscanned extends []
                ? State.PushTransform<State.Finalize<S>, "?", []>
                : State.Error<`Modifier '?' is only valid at the end of a definition.`>
            : Lookahead extends BranchingOperatorToken
            ? ShiftBranches<
                  ShiftBranch<
                      State.PushBranchingToken<S, Lookahead, Unscanned>,
                      Dict
                  >,
                  Dict
              >
            : Lookahead extends ")"
            ? State.CloseGroup<S, Unscanned>
            : State.Error<`Unexpected branch token ${Lookahead}.`>
        : State.Finalize<S>

    type ShiftBranch<S extends State.State, Dict> = ShiftOperators<
        ShiftBase<S, Dict>,
        Dict
    >

    type ShiftBase<S extends State.State, Dict> = S["unscanned"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "("
            ? ShiftExpression<State.OpenGroup<S, Unscanned>, Dict>
            : Lookahead extends LiteralEnclosingChar
            ? ShiftLiteral<State.ScanTo<S, Unscanned>, Lookahead, Lookahead>
            : Lookahead extends " "
            ? ShiftBase<State.ScanTo<S, Unscanned>, Dict>
            : ShiftNonLiteral<S, "", Dict>
        : MissingExpressionError<S>

    type ShiftLiteral<
        S extends State.State,
        FirstChar extends LiteralEnclosingChar,
        Token extends string
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends FirstChar
            ? State.PushBase<S, `${Token}${Lookahead}`, Unscanned>
            : ShiftLiteral<
                  State.ScanTo<S, Unscanned>,
                  FirstChar,
                  `${Token}${Lookahead}`
              >
        : State.Error<`${Token} requires a closing ${FirstChar}.`>

    type ShiftNonLiteral<
        S extends State.State,
        Token extends string,
        Dict
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends BaseTerminatingChar
            ? ReduceNonLiteral<S, Token, Dict>
            : ShiftNonLiteral<
                  State.ScanTo<S, Unscanned>,
                  `${Token}${Lookahead}`,
                  Dict
              >
        : ReduceNonLiteral<S, Token, Dict>

    type ReduceNonLiteral<
        S extends State.State,
        Token extends string,
        Dict
    > = IsResolvableName<Token, Dict> extends true
        ? State.PushBase<S, Token, S["unscanned"]>
        : Token extends NumberLiteral.Definition | BigintLiteral.Definition
        ? State.PushBase<S, Token, S["unscanned"]>
        : Token extends ""
        ? MissingExpressionError<S>
        : State.Error<`'${Token}' does not exist in your space.`>

    type MissingExpressionError<S extends State.State> =
        State.Error<`Expected an expression${S["branch"] extends []
            ? ""
            : ` after '${TreeToString<S["branch"]>}'`}.`>

    type ShiftOperators<
        S extends State.State,
        Dict
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends "["
            ? ShiftOperators<ShiftListToken<State.ScanTo<S, Unscanned>>, Dict>
            : Lookahead extends BranchTerminatingChar
            ? S
            : Lookahead extends ComparatorStartChar
            ? ShiftComparatorToken<State.ScanTo<S, Unscanned>, Lookahead, Dict>
            : Lookahead extends " "
            ? ShiftOperators<State.ScanTo<S, Unscanned>, Dict>
            : State.Error<`Invalid operator ${Lookahead}.`>
        : S

    type ShiftListToken<S extends State.State> = S["unscanned"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "]"
            ? State.PushTransform<S, "[]", Unscanned>
            : State.Error<`Missing expected ']'.`>
        : State.Error<`Missing expected ']'.`>

    type ShiftComparatorToken<
        S extends State.State,
        FirstChar extends ComparatorStartChar,
        Dict
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends "="
            ? ReduceBound<State.ScanTo<S, Unscanned>, `${FirstChar}=`, Dict>
            : FirstChar extends "="
            ? State.Error<`= is not a valid comparator. Use == instead.`>
            : // FirstChar must be > or < at this point
              ReduceBound<S, FirstChar, Dict>
        : State.Error<`Expected a bound condition after ${FirstChar}.`>

    type ReduceBound<
        S extends State.State,
        Token extends string,
        Dict
    > = S["expression"] extends BoundableNode
        ? ReduceRightBound<
              S,
              Token,
              ShiftBranch<
                  State.UpdateBranchContext<S, { rightBounded: true }>,
                  Dict
              >
          >
        : S["branch"]["ctx"]["rightBounded"] extends true
        ? State.Error<`Right side of comparator ${Token} cannot be bounded more than once.`>
        : S["expression"] extends NumberLiteral.Definition
        ? ReduceLeftBound<
              S,
              Token,
              ShiftBranch<
                  State.UpdateBranchContext<S, { leftBounded: true }>,
                  Dict
              >
          >
        : State.Error<`Left side of comparator ${Token} must be a number literal or boundable definition (got ${TreeToString<
              S["expression"]
          >}).`>

    type ReduceRightBound<
        Left extends State.State,
        Token extends string,
        Right extends State.State
    > = Right extends State.Error<string>
        ? Right
        : Right["expression"] extends NumberLiteral.Definition
        ? State.ScanTo<Left, Right["unscanned"]>
        : State.Error<`Right side of comparator ${Token} must be a number literal.`>

    type ReduceLeftBound<
        Left extends State.State,
        Token extends string,
        Right extends State.State
    > = Left["branch"]["ctx"]["leftBounded"] extends true
        ? State.Error<`Left side of comparator ${Token} cannot be bounded more than once.`>
        : Right extends State.Error<string>
        ? Right
        : Right["expression"] extends BoundableNode
        ? Right
        : State.Error<`Right side of comparator ${Token} must be a numbed-or-string-typed keyword or a list-typed expression.`>

    type ComparatorStartChar = "<" | ">" | "="

    type BaseTerminatingChar =
        | ModifyingOperatorStartChar
        | ComparatorStartChar
        | BranchTerminatingChar
        | " "

    type BranchTerminatingChar = "|" | "&" | ExpressionTerminatingChar

    type ExpressionTerminatingChar = ")" | "?"

    type BranchingOperatorToken = "|" | "&"

    type ModifyingOperatorStartChar = "["

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

    type InferTerminal<
        Token extends string,
        Ctx extends Base.Parsing.InferenceContext
    > = Token extends Keyword.Definition
        ? Keyword.Types[Token]
        : Token extends keyof Ctx["dict"]
        ? AliasType.Infer<Token, Ctx>
        : Token extends StringLiteral.SingleQuoted<infer Value>
        ? Value
        : Token extends StringLiteral.DoubleQuoted<infer Value>
        ? Value
        : Token extends RegexLiteral.Definition
        ? string
        : Token extends NumberLiteral.Definition<infer Value>
        ? Value
        : Token extends BigintLiteral.Definition<infer Value>
        ? Value
        : unknown

    export const matches = (def: unknown): def is string =>
        typeof def === "string"

    export const parse: Base.Parsing.ParseFn<string> = (def, ctx) =>
        tryNaiveParse(def, ctx) ?? fullParse(def, ctx)

    const tryNaiveParse = (def: string, ctx: Base.Parsing.Context) => {
        if (def.endsWith("?")) {
            const possibleIdentifierNode = tryNaiveParseList(
                def.slice(0, -1),
                ctx
            )
            if (possibleIdentifierNode) {
                return new OptionalNode(possibleIdentifierNode, ctx)
            }
        }
        return tryNaiveParseList(def, ctx)
    }

    const tryNaiveParseList = (def: string, ctx: Base.Parsing.Context) => {
        if (def.endsWith("[]")) {
            const possibleIdentifierNode = tryNaiveParseIdentifier(
                def.slice(0, -2),
                ctx
            )
            if (possibleIdentifierNode) {
                return new ListNode(possibleIdentifierNode, ctx)
            }
        }
        return tryNaiveParseIdentifier(def, ctx)
    }

    const tryNaiveParseIdentifier = (
        possibleIdentifier: string,
        ctx: Base.Parsing.Context
    ) => {
        if (Keyword.matches(possibleIdentifier)) {
            return Keyword.parse(possibleIdentifier)
        } else if (AliasNode.matches(possibleIdentifier, ctx)) {
            return new AliasNode(possibleIdentifier, ctx)
        }
    }

    const fullParse = (def: string, ctx: Base.Parsing.Context) => {
        const parser = new Parser(def, ctx)
        parser.shiftBranches()
        return parser.expression!
    }
}
