// TODO: Remove this once file is refactored
/* eslint-disable max-lines */
import { Get, ListChars } from "@re-/tools"
import { Base } from "./base/index.js"
import { ListNode, OptionalNode } from "./nonTerminal/index.js"
import { Parser } from "./parse.js"
import { DefaultLeft, Left, Reduce } from "./reduce.js"
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

    export type InitializeState<Def extends string> = {
        L: DefaultLeft
        R: InitializeRight<Def>
    }

    export type StateFrom<S extends State> = S

    type Z = ParseDefinition<"string[][]|number[]", {}>

    type ParseDefinition<Def extends string, Dict> = ParseBase<
        {
            L: DefaultLeft
            R: Shift.Base<ListChars<Def>, Dict>
        },
        Dict
    >

    type ParseBase<S extends State, Dict> = S["R"]["lookahead"] extends "("
        ? ParseBase<
              StateFrom<{
                  L: Reduce.OpenGroup<S["L"]>
                  R: Shift.Base<S["R"]["unscanned"], Dict>
              }>,
              Dict
          >
        : ParseOperators<
              StateFrom<{
                  L: Reduce.SetExpression<S["L"], S["R"]["lookahead"]>
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
                  L: Reduce.List<S["L"]>
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>,
              Dict
          >
        : S["R"]["lookahead"] extends BranchingOperatorToken
        ? ParseBase<
              StateFrom<{
                  L: Reduce.Branch<S["L"], S["R"]["lookahead"]>
                  R: Shift.Base<S["R"]["unscanned"], Dict>
              }>,
              Dict
          >
        : S["R"]["lookahead"] extends ")"
        ? ParseOperators<
              StateFrom<{
                  L: Reduce.CloseGroup<S["L"]>
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>,
              Dict
          >
        : ParseSuffixes<
              StateFrom<{
                  L: Reduce.SuffixStart<S["L"]>
                  R: S["R"]
              }>
          >

    type ParseSuffixes<S extends State> = S
    // S["R"]["lookahead"] extends ComparatorToken
    //     ? ReduceRightBound<
    //           ShiftUnenclosedBase<State.DiscardToken<S>>,
    //           S["R"]["lookahead"]
    //       >
    //     : ParseFinalizer<S>

    // export type Optional<L extends Left> = S["unscanned"] extends []
    //     ? ReduceModifier<FinalizeState<S>>
    //     : State.Error<`Suffix '?' is only valid at the end of a definition.`>

    // export type RightBound<
    //     S extends Left,
    //     Comparator extends ComparatorToken
    // > = S["lookahead"] extends NumberLiteralDefinition
    //     ? ParseFinalizer<
    //           Shift.Operator<
    //               State.UpdateBounds<S, { right: [Comparator, S["lookahead"]] }>
    //           >
    //       >
    //     : InvalidRightBound<S["lookahead"]>

    // type InvalidRightBound<Token extends string> =
    //     State.Error<`Right bound ${Token} must be a number literal followed only by other suffixes.`>

    // type ParseBranches<
    //     S extends State,
    //     Dict
    // > = S["L"]["expression"] extends ErrorToken<string>
    //     ? S
    //     : S["R"]["lookahead"] extends SuffixToken
    //     ? S
    //     : ParseBranches<
    //           StateFrom<{
    //               L: Reduce.Token<S["L"], S["R"]["lookahead"]>
    //               R: Shift.Token<S["R"], Dict>
    //           }>,
    //           Dict
    //       >

    // export type ReduceBase<
    //     L extends Left,
    //     Token extends string
    // > = Token extends "(" ? OpenGroup<L> : SetExpression<L, Token>

    // export type ReduceOperators<
    //     L extends Left,
    //     Token extends OperatorToken
    // > = Token extends "[]"
    //     ? ReduceModifier<L, Token>
    //     : Token extends BranchingOperatorToken
    //     ? Branch<L, Token>
    //     : Token extends ")"
    //     ? CloseGroup<L>
    //     : {}

    // type ReduceBranch<L extends Left, R extends Right> = StateFrom<{
    //     L: Reduce.SetExpression<L, R["lookahead"]>
    //     R: Shift.Operator<R>
    // }>

    // type ShiftDefinition<Def extends string, Dict> = ParsePrefixes<
    //     ParseBranch<State.Initialize<Def>, Dict>,
    //     Dict
    // >

    // type FinalizeState<S extends State> = S["openGroups"] extends []
    //     ? {} extends S["bounds"]
    //         ? S
    //         : S["expression"] extends BoundableNode
    //         ? S
    //         : State.Error<`Bounded expression '${TreeToString<
    //               S["expression"]
    //           >}' must be a number-or-string-typed keyword or a list-typed expression.`>
    //     : State.Error<`Missing ).`>

    // type ParsePrefixes<
    //     L extends Left,
    //     R extends Right,
    //     Dict
    // > = S["expression"] extends NumberLiteralDefinition
    //     ? S["lookahead"] extends ComparatorToken
    //         ? ParseExpression<
    //               State.From<{
    //                   openGroups: []
    //                   branch: S["branch"]
    //                   expression: []
    //                   lookahead: ""
    //                   unscanned: S["unscanned"]
    //                   bounds: S["bounds"] & {
    //                       left: [S["expression"], S["lookahead"]]
    //                   }
    //               }>,
    //               Dict
    //           >
    //         : ParseOperators<S, Dict>
    //     : ParseOperators<S, Dict>

    // type ParseFinalizer<S extends State.State> = S["lookahead"] extends "END"
    //     ? FinalizeState<S>
    //     : S["lookahead"] extends "?"
    //     ? ReduceOptional<S>
    //     : State.Error<`Unexpected suffix token ${S["lookahead"]}.`>

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
    type SuffixToken = "END" | "?" | ComparatorToken | ErrorToken<string>

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
