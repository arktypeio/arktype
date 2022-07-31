// TODO: Remove this once file is refactored
/* eslint-disable max-lines */
import { Get, ListChars } from "@re-/tools"
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
            token: string
            unscanned: string[]
            ctx: DefContext
        }

        export type Initialize<Def extends string> = From<{
            openGroups: []
            branch: DefaultBranchState
            expression: []
            token: ""
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
            token: S["token"]
            unscanned: Unscanned
            ctx: S["ctx"]
        }>

        export type UpdateContext<
            S extends State,
            Updates extends Partial<DefContext>
        > = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: S["expression"]
            token: ""
            unscanned: S["unscanned"]
            ctx: S["ctx"] & Updates
        }>

        export type ReduceBase<S extends State> = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: S["token"]
            token: ""
            unscanned: S["unscanned"]
            ctx: S["ctx"]
        }>

        export type ShiftChar<
            S extends State,
            Char extends string,
            Unscanned extends string[]
        > = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: S["expression"]
            token: `${S["token"]}${Char}`
            unscanned: Unscanned
            ctx: S["ctx"]
        }>

        export type DiscardToken<S extends State> = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: S["expression"]
            token: ""
            unscanned: S["unscanned"]
            ctx: S["ctx"]
        }>

        export type ReduceModifier<S extends State> = From<{
            openGroups: S["openGroups"]
            branch: S["branch"]
            expression: [S["expression"], S["token"]]
            token: ""
            unscanned: S["unscanned"]
            ctx: S["ctx"]
        }>

        export type ReduceBrancher<S extends State> = From<{
            openGroups: S["openGroups"]
            branch: S["token"] extends "|"
                ? PushUnion<S["branch"], S["expression"]>
                : PushIntersection<S["branch"], S["expression"]>
            expression: []
            token: ""
            unscanned: S["unscanned"]
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

        type ExtractIfSingleton<T> = T extends [infer Element] ? Element : T

        type MergeExpression<
            Branch extends CurrentBranch,
            Expression
        > = ExtractIfSingleton<[...Branch, Expression]>

        type MergeBranches<B extends BranchState, Expression> = MergeExpression<
            B["union"],
            MergeExpression<B["intersection"], Expression>
        >

        export type ReduceSuffixStart<S extends State> = From<{
            openGroups: S["openGroups"]
            branch: DefaultBranchState
            expression: MergeBranches<S["branch"], S["expression"]>
            token: S["token"]
            unscanned: S["unscanned"]
            ctx: S["ctx"]
        }>

        export type OpenGroup<
            S extends State,
            Unscanned extends string[]
        > = From<{
            openGroups: [...S["openGroups"], S["branch"]]
            branch: DefaultBranchState
            expression: []
            token: S["token"]
            unscanned: Unscanned
            ctx: S["ctx"]
        }>

        type PopGroup<Stack extends BranchState[], Top extends BranchState> = [
            ...Stack,
            Top
        ]

        export type CloseGroup<S extends State> =
            S["openGroups"] extends PopGroup<infer Stack, infer Top>
                ? From<{
                      openGroups: Stack
                      branch: Top
                      expression: MergeBranches<S["branch"], S["expression"]>
                      token: ""
                      unscanned: S["unscanned"]
                      ctx: S["ctx"]
                  }>
                : Error<`Unexpected ).`>

        export type Error<Message extends string> = From<{
            openGroups: []
            branch: DefaultBranchState
            expression: ErrorToken<Message>
            token: ""
            unscanned: []
            ctx: {}
        }>

        export type From<S extends State> = S
    }

    type ParseDefinition<Def extends string, Dict> = Get<
        ShiftDefinition<Def, Dict>,
        "expression"
    >

    type ShiftDefinition<Def extends string, Dict> = ParsePrefixes<
        ParseBranch<State.Initialize<Def>, Dict>,
        Dict
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

    type ParseExpression<S extends State.State, Dict> = ParseOperators<
        ParseBranch<S, Dict>,
        Dict
    >

    type ParseBranch<S extends State.State, Dict> = LexOperator<
        ParseBase<S, Dict>
    >

    type ParseBase<S extends State.State, Dict> = S["unscanned"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "("
            ? ParseBase<State.OpenGroup<S, Unscanned>, Dict>
            : Lookahead extends LiteralEnclosingChar
            ? ReduceEnclosedBase<
                  ShiftEnclosedBase<
                      State.ShiftChar<S, Lookahead, Unscanned>,
                      Lookahead
                  >
              >
            : Lookahead extends " "
            ? ParseBase<State.ScanTo<S, Unscanned>, Dict>
            : ReduceUnenclosedBase<ShiftUnenclosedBase<S>, Dict>
        : MissingExpressionError<S>

    type ShiftEnclosedBase<
        S extends State.State,
        StartChar extends LiteralEnclosingChar
    > = S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
        ? Lookahead extends StartChar
            ? State.ShiftChar<S, Lookahead, Unscanned>
            : ShiftEnclosedBase<
                  State.ShiftChar<S, Lookahead, Unscanned>,
                  StartChar
              >
        : State.Error<`${S["token"]} requires a closing ${StartChar}.`>

    type ReduceEnclosedBase<S extends State.State> = S["token"] extends "//"
        ? State.Error<`Regex literals cannot be empty.`>
        : State.ReduceBase<S>

    type ShiftUnenclosedBase<S extends State.State> =
        S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
            ? Lookahead extends BaseTerminatingChar
                ? S
                : ShiftUnenclosedBase<State.ShiftChar<S, Lookahead, Unscanned>>
            : S

    type ReduceUnenclosedBase<S extends State.State, Dict> = IsResolvableName<
        S["token"],
        Dict
    > extends true
        ? State.ReduceBase<S>
        : S["token"] extends NumberLiteralDefinition | BigintLiteralDefinition
        ? State.ReduceBase<S>
        : S["token"] extends ""
        ? MissingExpressionError<S>
        : State.Error<`'${S["token"]}' does not exist in your space.`>

    type MissingExpressionError<S extends State.State> =
        State.Error<`Expected an expression${S["branch"] extends {}
            ? ""
            : ` after '${TreeToString<S["branch"]>}'`}.`>

    type ParseOperators<
        S extends State.State,
        Dict
    > = S["token"] extends SuffixToken
        ? ParseSuffixes<State.ReduceSuffixStart<S>>
        : S["token"] extends "[]"
        ? ParseOperators<LexOperator<State.ReduceModifier<S>>, Dict>
        : S["token"] extends BranchingOperatorToken
        ? ParseExpression<State.ReduceBrancher<S>, Dict>
        : S["token"] extends ")"
        ? ParseOperators<LexOperator<State.CloseGroup<S>>, Dict>
        : State.Error<`Unexpected token '${S["token"]}'.`>

    type LexOperator<S extends State.State> = S["unscanned"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "["
            ? LexListToken<State.ShiftChar<S, "[", Unscanned>>
            : Lookahead extends ComparatorStartChar
            ? LexComparatorToken<State.ShiftChar<S, Lookahead, Unscanned>>
            : Lookahead extends " "
            ? LexOperator<State.ScanTo<S, Unscanned>>
            : State.ShiftChar<S, Lookahead, Unscanned>
        : State.ShiftChar<S, "END", []>

    type LexComparatorToken<S extends State.State> =
        S["unscanned"] extends Scan<infer Lookahead, infer Unscanned>
            ? Lookahead extends "="
                ? State.ShiftChar<S, Lookahead, Unscanned>
                : S["token"] extends "="
                ? State.Error<`= is not a valid comparator. Use == instead.`>
                : S
            : State.Error<`Expected a bound condition after ${S["token"]}.`>

    type LexListToken<S extends State.State> = S["unscanned"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "]"
            ? State.ShiftChar<S, "]", Unscanned>
            : State.Error<`Missing expected ']'.`>
        : State.Error<`Missing expected ']'.`>

    type ParsePrefixes<
        S extends State.State,
        Dict
    > = S["expression"] extends NumberLiteralDefinition
        ? S["token"] extends ComparatorToken
            ? S["ctx"]["bounded"] extends true
                ? State.Error<`Definitions cannot have multiple left bounds.`>
                : ParseExpression<
                      State.From<{
                          openGroups: []
                          branch: S["branch"]
                          expression: []
                          token: ""
                          unscanned: S["unscanned"]
                          ctx: { bounded: true }
                      }>,
                      Dict
                  >
            : ParseOperators<S, Dict>
        : ParseOperators<S, Dict>

    type ParseSuffixes<S extends State.State> =
        S["token"] extends ComparatorToken
            ? ReduceRightBound<ShiftUnenclosedBase<State.DiscardToken<S>>>
            : ParseFinalizer<S>

    type ParseFinalizer<S extends State.State> = S["token"] extends "END"
        ? FinalizeState<S>
        : S["token"] extends "?"
        ? ReduceOptional<S>
        : State.Error<`Unexpected suffix token ${S["token"]}.`>

    type ReduceOptional<S extends State.State> = S["unscanned"] extends []
        ? State.ReduceModifier<FinalizeState<S>>
        : State.Error<`Suffix '?' is only valid at the end of a definition.`>

    type FF = ShiftDefinition<"string==4", {}>

    type ReduceRightBound<S extends State.State> =
        S["token"] extends NumberLiteralDefinition
            ? ParseFinalizer<
                  LexOperator<State.UpdateContext<S, { bounded: true }>>
              >
            : InvalidRightBound<S["token"]>

    type InvalidRightBound<Token extends string> =
        State.Error<`Right bound ${Token} must be a number literal followed only by other suffixes.`>

    type ComparatorStartChar = "<" | ">" | "="

    type BaseTerminatingChar =
        | ModifyingOperatorStartChar
        | BranchTerminatingChar
        | " "

    type BranchTerminatingChar =
        | BranchingOperatorToken
        | ")"
        | SuffixToken
        | "="

    type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="
    type SuffixToken = "END" | "?" | ComparatorToken

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
