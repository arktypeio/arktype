// TODO: Remove this once file is refactored
/* eslint-disable max-lines */
import { ListChars } from "@re-/tools"
import { Base } from "./base/index.js"
import { ListNode, OptionalNode } from "./nonTerminal/index.js"
import { Parser } from "./parse.js"
import {
    AliasNode,
    BigintLiteralDefinition,
    InferTerminalStr,
    Keyword,
    NumberLiteralDefinition
} from "./terminal/index.js"

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

    type IsResolvableName<Def, Dict> = Def extends Keyword.Definition
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
        ? InferTerminalStr<Tree, Ctx>
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
            ctx: DefContext
        }

        export type Initialize<Def extends string> = From<{
            openGroups: []
            branch: DefaultBranchState
            expression: []
            unscanned: ListChars<Def>
            ctx: {}
        }>

        export type BranchState = {
            union: CurrentBranch
            intersection: CurrentBranch
        }

        export type DefaultBranchState = {
            union: []
            intersection: []
        }

        export type CurrentBranch = [] | [unknown, string]

        export type DefContext = {
            bounded?: boolean
        }

        export type ScanTo<S extends State, Unscanned extends string[]> = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: S["expression"]
            unscanned: Unscanned
            ctx: S["ctx"]
        }>

        export type UpdateContext<
            S extends State,
            Updates extends Partial<DefContext>,
            Unscanned extends string[] = S["unscanned"]
        > = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: S["expression"]
            unscanned: Unscanned
            ctx: S["ctx"] & Updates
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
            ctx: S["ctx"]
        }>

        type PushIntersection<B extends BranchState, Expression> = {
            union: B["union"]
            intersection: [
                B["intersection"] extends []
                    ? Expression
                    : [...B["intersection"], Expression],
                "&"
            ]
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
            ctx: S["ctx"]
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

        export type ShiftEnd<S extends State> = From<{
            openGroups: S["openGroups"]
            branch: DefaultBranchState
            expression: MergeBranches<S["branch"], S["expression"]>
            unscanned: []
            ctx: S["ctx"]
        }>

        export type PushTransform<
            S extends State,
            Token extends string,
            Unscanned extends string[]
        > = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: [S["expression"], Token]
            unscanned: Unscanned
            ctx: S["ctx"]
        }>

        export type OpenGroup<
            S extends State,
            Unscanned extends string[]
        > = From<{
            openGroups: [...S["openGroups"], S["branch"]]
            branch: DefaultBranchState
            expression: []
            unscanned: Unscanned
            ctx: S["ctx"]
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
                  ctx: S["ctx"]
              }>
            : Error<`Unexpected ).`>

        export type Error<Message extends string> = From<{
            openGroups: []
            branch: DefaultBranchState
            expression: ErrorToken<Message>
            unscanned: []
            ctx: {}
        }>

        export type From<S extends State> = S
    }

    type ParseDefinition<Def extends string, Dict> = ShiftDefinition<
        Def,
        Dict
    >["expression"]

    type ShiftDefinition<Def extends string, Dict> = FinalizeState<
        ShiftExpression<State.Initialize<Def>, Dict>
    >

    type FinalizeState<S extends State.State> = S["openGroups"] extends []
        ? S["ctx"]["bounded"] extends true
            ? S["expression"] extends BoundableNode
                ? S
                : State.Error<`Bounded expression '${TreeToString<
                      S["expression"]
                  >}' must be a number-or-string-typed keyword or a list-typed expression.`>
            : S
        : State.Error<`Missing ).`>

    type ShiftOptional<S extends State.State> = S["unscanned"] extends ["?"]
        ? State.PushTransform<State.ShiftEnd<S>, "?", []>
        : State.Error<`Suffix '?' is only valid at the end of a definition.`>

    type ShiftRightBound<
        S extends State.State,
        BoundToken extends string
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends "?"
            ? BoundToken extends NumberLiteralDefinition
                ? ShiftOptional<State.UpdateContext<S, { bounded: true }>>
                : InvalidRightBound<BoundToken>
            : ShiftRightBound<
                  State.ScanTo<S, Unscanned>,
                  `${BoundToken}${Lookahead}`
              >
        : BoundToken extends NumberLiteralDefinition
        ? State.ShiftEnd<State.UpdateContext<S, { bounded: true }>>
        : InvalidRightBound<BoundToken>

    type InvalidRightBound<Token extends string> =
        State.Error<`Right bound ${Token} must be a number literal followed only by other suffixes.`>

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
            ? ShiftOptional<S>
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
        : State.ShiftEnd<S>

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
            ? ShiftEnclosedBase<
                  State.ScanTo<S, Unscanned>,
                  Lookahead,
                  Lookahead
              >
            : Lookahead extends " "
            ? ShiftBase<State.ScanTo<S, Unscanned>, Dict>
            : ShiftUnenclosedBase<S, "", Dict>
        : MissingExpressionError<S>

    type ShiftEnclosedBase<
        S extends State.State,
        FirstChar extends LiteralEnclosingChar,
        Token extends string
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends FirstChar
            ? ReduceEnclosedBase<
                  State.PushBase<S, `${Token}${Lookahead}`, Unscanned>
              >
            : ShiftEnclosedBase<
                  State.ScanTo<S, Unscanned>,
                  FirstChar,
                  `${Token}${Lookahead}`
              >
        : State.Error<`${Token} requires a closing ${FirstChar}.`>

    type ReduceEnclosedBase<S extends State.State> =
        S["expression"] extends "//"
            ? State.Error<`Regex literals cannot be empty.`>
            : S

    type ShiftUnenclosedBase<
        S extends State.State,
        Token extends string,
        Dict
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends BaseTerminatingChar
            ? ReduceUnenclosedBase<
                  State.PushBase<S, Token, S["unscanned"]>,
                  Dict
              >
            : ShiftUnenclosedBase<
                  State.ScanTo<S, Unscanned>,
                  `${Token}${Lookahead}`,
                  Dict
              >
        : ReduceUnenclosedBase<State.PushBase<S, Token, S["unscanned"]>, Dict>

    type ReduceUnenclosedBase<S extends State.State, Dict> = IsResolvableName<
        S["expression"],
        Dict
    > extends true
        ? S
        : S["expression"] extends
              | NumberLiteralDefinition
              | BigintLiteralDefinition
        ? S
        : S["expression"] extends ""
        ? MissingExpressionError<S>
        : State.Error<`'${S["expression"] &
              string}' does not exist in your space.`>

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
        StartChar extends ComparatorStartChar,
        Dict
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends "="
            ? ReduceBound<State.ScanTo<S, Unscanned>, Dict>
            : StartChar extends "="
            ? State.Error<`= is not a valid comparator. Use == instead.`>
            : ReduceBound<S, Dict>
        : State.Error<`Expected a bound condition after ${StartChar}.`>

    type ReduceBound<
        S extends State.State,
        Dict
    > = IsValidLeftBound<S> extends true
        ? S["ctx"]["bounded"] extends true
            ? State.Error<`Definitions cannot have multiple left bounds.`>
            : ShiftBranch<State.UpdateContext<S, { bounded: true }>, Dict>
        : ShiftRightBound<S, "">

    type IsValidLeftBound<S extends State.State> =
        S["branch"] extends State.DefaultBranchState
            ? S["openGroups"] extends []
                ? S["expression"] extends NumberLiteralDefinition
                    ? true
                    : false
                : false
            : false

    type ComparatorStartChar = "<" | ">" | "="

    type BaseTerminatingChar =
        | ModifyingOperatorStartChar
        | ComparatorStartChar
        | BranchTerminatingChar
        | " "

    type BranchTerminatingChar =
        | BranchingOperatorToken
        | ExpressionTerminatingChar

    type ExpressionTerminatingChar = ")" | "?"

    type BranchingOperatorToken = "|" | "&"

    type ModifyingOperatorStartChar = "["

    type LiteralEnclosingChar = `'` | `"` | `/`

    type ErrorToken<Message extends string> = `!${Message}`

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanum" in "100>alphanum")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    type BoundableNode =
        | Keyword.OfTypeNumber
        | Keyword.OfTypeString
        | [unknown, "[]"]

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
