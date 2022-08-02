// TODO: Remove this once file is refactored
/* eslint-disable max-lines */
import { Get, ListChars } from "@re-/tools"
import { Base } from "./base/index.js"
import { ListNode, OptionalNode } from "./nonTerminal/index.js"
import { Parser } from "./parse.js"
import { InitializeRight, Right, Shift } from "./shift.js"
import {
    AliasNode,
    BigintLiteralDefinition,
    InferTerminalStr,
    Keyword,
    NumberLiteralDefinition
} from "./terminal/index.js"

export type State = {
    L: Left
    R: Right
}

export type Left = {
    openGroups: BranchState[]
    branch: BranchState
    expression: unknown
    bounds: Bounds
}

export type InitialLeft = {
    openGroups: []
    branch: DefaultBranchState
    expression: []
    bounds: {}
}

export type BranchState = {
    union: CurrentBranch
    intersection: CurrentBranch
}

export type DefaultBranchState = {
    union: []
    intersection: []
}

type LeftFrom<L extends Left> = L

export type CurrentBranch = [] | [unknown, string]

type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="

export type Bounds = {
    left?: [NumberLiteralDefinition, ComparatorToken]
    right?: [ComparatorToken, NumberLiteralDefinition]
}

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
                : TreeFrom<Def, Dict>
            : IsResolvableName<Child, Dict> extends true
            ? [Child, "?"]
            : TreeFrom<Def, Dict>
        : Def extends `${infer Child}[]`
        ? IsResolvableName<Child, Dict> extends true
            ? [Child, "[]"]
            : TreeFrom<Def, Dict>
        : IsResolvableName<Def, Dict> extends true
        ? Def
        : TreeFrom<Def, Dict>

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

    type TransformedNode<Child, Token extends string> = [Child, Token]

    type BranchNode<Left, Token extends string, Right> = [Left, Token, Right]

    type TreeToString<Tree> = Tree extends string
        ? Tree
        : Tree extends TransformedNode<infer Child, infer Token>
        ? `${TreeToString<Child>}${Token}`
        : Tree extends BranchNode<infer Left, infer Token, infer Right>
        ? `${TreeToString<Left>}${Token}${TreeToString<Right>}`
        : ""

    export type BranchState = {
        union: CurrentBranch
        intersection: CurrentBranch
    }

    export type DefaultBranchState = {
        union: []
        intersection: []
    }

    export type CurrentBranch = [] | [unknown, string]

    export type Bounds = {
        left?: [NumberLiteralDefinition, ComparatorToken]
        right?: [ComparatorToken, NumberLiteralDefinition]
    }

    export type InitializeState<Def extends string, Dict> = {
        L: InitialLeft
        R: Shift.Base<ListChars<Def>, Dict>
    }

    export type StateFrom<S extends State> = S

    type TreeFrom<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "L">,
        "expression"
    >

    type ParseDefinition<Def extends string, Dict> = ParsePrefix<
        InitializeState<Def, Dict>,
        Dict
    >

    type ParsePrefix<
        S extends State,
        Dict
    > = S["R"]["lookahead"] extends NumberLiteralDefinition
        ? ParsePossibleLowerBound<
              StateFrom<{
                  L: S["L"]
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>,
              S["R"]["lookahead"],
              Dict
          >
        : ParseBase<S, Dict>

    type ParsePossibleLowerBound<
        S extends State,
        Value extends NumberLiteralDefinition,
        Dict
    > = S["R"]["lookahead"] extends ComparatorToken
        ? ParseBase<
              StateFrom<{
                  L: LeftBound<S["L"], S["R"]["lookahead"], Value>
                  R: Shift.Base<S["R"]["unscanned"], Dict>
              }>,
              Dict
          >
        : ParseOperators<
              StateFrom<{ L: SetExpression<S["L"], Value>; R: S["R"] }>,
              Dict
          >

    type ParseBase<S extends State, Dict> = S["R"]["lookahead"] extends "("
        ? ParseBase<
              StateFrom<{
                  L: OpenGroup<S["L"]>
                  R: Shift.Base<S["R"]["unscanned"], Dict>
              }>,
              Dict
          >
        : ParseOperators<
              StateFrom<{
                  L: SetExpression<S["L"], S["R"]["lookahead"]>
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>,
              Dict
          >

    type ParseOperators<
        S extends State,
        Dict
    > = S["R"]["lookahead"] extends "[]"
        ? ParseOperators<
              StateFrom<{
                  L: Modifier<S["L"], "[]">
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>,
              Dict
          >
        : S["R"]["lookahead"] extends BranchToken
        ? ParseBase<
              StateFrom<{
                  L: Branch<S["L"], S["R"]["lookahead"]>
                  R: Shift.Base<S["R"]["unscanned"], Dict>
              }>,
              Dict
          >
        : S["R"]["lookahead"] extends ")"
        ? ParseOperators<
              StateFrom<{
                  L: CloseGroup<S["L"]>
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>,
              Dict
          >
        : // Must be a suffix token by process of elimination
          ParseSuffixes<
              StateFrom<{
                  L: SuffixStart<S["L"]>
                  R: S["R"]
              }>,
              Dict
          >

    type ParseSuffixes<
        S extends State,
        Dict
    > = S["R"]["lookahead"] extends ComparatorToken
        ? ParseRightBound<
              StateFrom<{
                  L: S["L"]
                  R: Shift.Base<S["R"]["unscanned"], Dict>
              }>,
              S["R"]["lookahead"]
          >
        : ParseFinalizing<S>

    export type ParseRightBound<
        S extends State,
        Comparator extends ComparatorToken
    > = S["R"]["lookahead"] extends NumberLiteralDefinition
        ? ParseFinalizing<
              StateFrom<{
                  L: RightBound<S["L"], Comparator, S["R"]["lookahead"]>
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>
          >
        : SemanticError<
              S,
              `Right bound ${S["R"]["lookahead"]} must be a number literal followed only by other suffixes.`
          >

    export type SemanticError<
        S extends State,
        Message extends string
    > = StateFrom<{ L: Error<S["L"], Message>; R: S["R"] }>

    type FinalizeState<S extends State> = {} extends S["L"]["bounds"]
        ? S
        : S["L"]["expression"] extends BoundableNode
        ? S
        : SemanticError<
              S,
              `Bounded expression '${TreeToString<
                  S["L"]["expression"]
              >}' must be a number-or-string-typed keyword or a list-typed expression.`
          >

    type ParseFinalizing<S extends State> = S["R"]["lookahead"] extends "END"
        ? FinalizeState<S>
        : S["R"]["lookahead"] extends "?"
        ? ParseOptional<FinalizeState<S>>
        : SemanticError<S, `Unexpected suffix token ${S["R"]["lookahead"]}.`>

    export type ParseOptional<S extends State> = S["R"]["unscanned"] extends []
        ? StateFrom<{
              L: Modifier<S["L"], "?">
              R: Shift.Operator<S["R"]["unscanned"]>
          }>
        : SemanticError<
              S,
              `Suffix '?' is only valid at the end of a definition.`
          >

    type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="
    type SuffixToken = "END" | "?" | ComparatorToken | ErrorToken<string>

    type BranchToken = "|" | "&"

    type ErrorToken<Message extends string> = `!${Message}`

    export type OpenGroup<L extends Left> = LeftFrom<{
        openGroups: [...L["openGroups"], L["branch"]]
        branch: DefaultBranchState
        expression: []
        bounds: L["bounds"]
    }>

    type PopGroup<Stack extends BranchState[], Top extends BranchState> = [
        ...Stack,
        Top
    ]

    export type SetExpression<L extends Left, Token extends string> = LeftFrom<{
        openGroups: L["openGroups"]
        branch: L["branch"]
        expression: Token
        bounds: L["bounds"]
    }>

    type Error<L extends Left, Message extends string> = SetExpression<
        L,
        ErrorToken<Message>
    >

    export type CloseGroup<L extends Left> = L["openGroups"] extends PopGroup<
        infer Stack,
        infer Top
    >
        ? LeftFrom<{
              openGroups: Stack
              branch: Top
              expression: MergeBranches<L["branch"], L["expression"]>
              bounds: L["bounds"]
          }>
        : Error<L, `Unexpected ).`>

    export type SuffixStart<L extends Left> = L["openGroups"] extends []
        ? LeftFrom<{
              openGroups: L["openGroups"]
              branch: DefaultBranchState
              expression: MergeBranches<L["branch"], L["expression"]>
              bounds: L["bounds"]
          }>
        : Error<L, "Missing ).">

    export type LeftBound<
        L extends Left,
        Comparator extends ComparatorToken,
        Bound extends NumberLiteralDefinition
    > = LeftFrom<{
        openGroups: L["openGroups"]
        branch: L["branch"]
        expression: ""
        bounds: {
            left: [Bound, Comparator]
        }
    }>

    export type RightBound<
        L extends Left,
        Comparator extends ComparatorToken,
        Bound extends NumberLiteralDefinition
    > = LeftFrom<{
        openGroups: L["openGroups"]
        branch: L["branch"]
        expression: L["expression"]
        bounds: L["bounds"] & {
            right: [Comparator, Bound]
        }
    }>

    export type ModifierToken = "[]" | "?"

    export type Modifier<
        L extends Left,
        Token extends ModifierToken
    > = LeftFrom<{
        openGroups: L["openGroups"]
        branch: L["branch"]
        expression: [L["expression"], Token]
        bounds: L["bounds"]
    }>

    export type Branch<L extends Left, Token extends BranchToken> = LeftFrom<{
        openGroups: L["openGroups"]
        branch: Token extends "|"
            ? Union<L["branch"], L["expression"]>
            : Intersection<L["branch"], L["expression"]>
        expression: []
        bounds: L["bounds"]
    }>

    type Union<B extends BranchState, Expression> = {
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

    type Intersection<B extends BranchState, Expression> = {
        union: B["union"]
        intersection: [
            B["intersection"] extends []
                ? Expression
                : [...B["intersection"], Expression],
            "&"
        ]
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
