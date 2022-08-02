import { Get, ListChars } from "@re-/tools"
import { Branches } from "./nonTerminal/branch/branch.js"
import { GroupType, IntersectionType, UnionType } from "./nonTerminal/index.js"
import type { Right, Shift } from "./shift.js"
import { Keyword, NumberLiteralDefinition } from "./terminal/index.js"

export namespace ParserType {
    export type Parse<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "L">,
        "expression"
    >

    export type State = {
        L: Left
        R: Right
    }

    export type StateFrom<S extends State> = S

    export type ErrorState<
        S extends State,
        Message extends string
    > = StateFrom<{
        L: SetExpression<S["L"], Error<Message>>
        R: S["R"]
    }>

    export type Error<Message extends string> = `!${Message}`

    export type Left = {
        openGroups: Branches.State[]
        branch: Branches.State
        expression: unknown
        bounds: Bounds
    }

    export type InitialLeft = {
        openGroups: []
        branch: Branches.Initial
        expression: []
        bounds: {}
    }

    type LeftFrom<L extends Left> = L

    export type Bounds = {
        left?: [NumberLiteralDefinition, ComparatorToken]
        right?: [ComparatorToken, NumberLiteralDefinition]
    }

    export type InitializeState<Def extends string, Dict> = {
        L: InitialLeft
        R: Shift.Base<ListChars<Def>, Dict>
    }

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
        : ParseMain<S, Dict>

    type ParsePossibleLowerBound<
        S extends State,
        Value extends NumberLiteralDefinition,
        Dict
    > = S["R"]["lookahead"] extends ComparatorToken
        ? ParseMain<
              StateFrom<{
                  L: LeftBound<S["L"], S["R"]["lookahead"], Value>
                  R: Shift.Base<S["R"]["unscanned"], Dict>
              }>,
              Dict
          >
        : ParseMain<
              StateFrom<{ L: SetExpression<S["L"], Value>; R: S["R"] }>,
              Dict
          >

    type ParseMain<
        S extends State,
        Dict
    > = S["R"]["lookahead"] extends SuffixToken
        ? ParseSuffixes<S, Dict>
        : ParseMain<ParseNext<S, Dict>, Dict>

    type ParseNext<S extends State, Dict> = S["R"]["lookahead"] extends "[]"
        ? StateFrom<{
              L: Modifier<S["L"], "[]">
              R: Shift.Operator<S["R"]["unscanned"]>
          }>
        : S["R"]["lookahead"] extends "|"
        ? UnionType.Parse<S, Dict>
        : S["R"]["lookahead"] extends "&"
        ? IntersectionType.Parse<S, Dict>
        : S["R"]["lookahead"] extends ")"
        ? GroupType.ParseClose<S>
        : S["R"]["lookahead"] extends "("
        ? GroupType.ParseOpen<S, Dict>
        : StateFrom<{
              L: SetExpression<S["L"], S["R"]["lookahead"]>
              R: Shift.Operator<S["R"]["unscanned"]>
          }>

    type ParseSuffixes<S extends State, Dict> = S["L"]["openGroups"] extends []
        ? ParsePossibleRightBound<
              StateFrom<{
                  L: LeftFrom<{
                      openGroups: S["L"]["openGroups"]
                      branch: Branches.Initial
                      expression: Branches.MergeAll<
                          S["L"]["branch"],
                          S["L"]["expression"]
                      >
                      bounds: S["L"]["bounds"]
                  }>
                  R: S["R"]
              }>,
              Dict
          >
        : ErrorState<S, "Missing ).">

    type ParsePossibleRightBound<
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
        : ErrorState<
              S,
              `Right bound ${S["R"]["lookahead"]} must be a number literal followed only by other suffixes.`
          >

    type FinalizeState<S extends State> = {} extends S["L"]["bounds"]
        ? S
        : S["L"]["expression"] extends BoundableNode
        ? S
        : ErrorState<
              S,
              `Bounded expression '${TreeToString<
                  S["L"]["expression"]
              >}' must be a number-or-string-typed keyword or a list-typed expression.`
          >

    type ParseFinalizing<S extends State> = S["R"]["lookahead"] extends "END"
        ? FinalizeState<S>
        : S["R"]["lookahead"] extends "?"
        ? ParseOptional<FinalizeState<S>>
        : S["R"]["lookahead"] extends Error<string>
        ? StateFrom<{
              L: SetExpression<S["L"], S["R"]["lookahead"]>
              R: S["R"]
          }>
        : ErrorState<S, `Unexpected suffix token ${S["R"]["lookahead"]}.`>

    export type ParseOptional<S extends State> = S["R"]["unscanned"] extends []
        ? StateFrom<{
              L: Modifier<S["L"], "?">
              R: Shift.Operator<S["R"]["unscanned"]>
          }>
        : ErrorState<S, `Suffix '?' is only valid at the end of a definition.`>

    type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="
    type SuffixToken = "END" | "?" | ComparatorToken | Error<string>

    export type SetExpression<L extends Left, Token extends string> = LeftFrom<{
        openGroups: L["openGroups"]
        branch: L["branch"]
        expression: Token
        bounds: L["bounds"]
    }>

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

    type TransformedNode<Child, Token extends string> = [Child, Token]

    type BranchNode<Left, Token extends string, Right> = [Left, Token, Right]

    type TreeToString<Tree> = Tree extends string
        ? Tree
        : Tree extends TransformedNode<infer Child, infer Token>
        ? `${TreeToString<Child>}${Token}`
        : Tree extends BranchNode<infer Left, infer Token, infer Right>
        ? `${TreeToString<Left>}${Token}${TreeToString<Right>}`
        : ""

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

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanum" in "100>alphanum")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    type BoundableNode =
        | Keyword.OfTypeNumber
        | Keyword.OfTypeString
        | [unknown, "[]"]
}
