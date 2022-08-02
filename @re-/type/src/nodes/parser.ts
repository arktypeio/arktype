import { Get, ListChars } from "@re-/tools"
import { Branches } from "./nonTerminal/branch/branch.js"
import {
    Bounds,
    GroupType,
    IntersectionType,
    List,
    Optional,
    UnionType
} from "./nonTerminal/index.js"
import type { Shift } from "./shift.js"
import { NumberLiteralDefinition } from "./terminal/index.js"

export namespace ParserType {
    export type Parse<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "L">,
        "expression"
    >

    export type State = {
        L: Left
        R: Shift.Right
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
        groups: Branches.State[]
        branches: Branches.State
        expression: unknown
        bounds: Bounds.T.State
    }

    export type InitialLeft = {
        groups: []
        branches: Branches.Initial
        expression: []
        bounds: {}
    }

    type LeftFrom<L extends Left> = L

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
        ? Bounds.T.ParsePossibleLeftBound<
              StateFrom<{
                  L: S["L"]
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>,
              S["R"]["lookahead"],
              Dict
          >
        : ParseMain<S, Dict>

    export type ParseMain<
        S extends State,
        Dict
    > = S["R"]["lookahead"] extends SuffixToken
        ? ParseSuffixes<S, Dict>
        : ParseMain<ParseNext<S, Dict>, Dict>

    type ParseNext<S extends State, Dict> = S["R"]["lookahead"] extends "[]"
        ? List.T.Parse<S>
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

    type ParseSuffixes<S extends State, Dict> = S["L"]["groups"] extends []
        ? Bounds.T.ParsePossibleRightBound<
              StateFrom<{
                  L: LeftFrom<{
                      groups: S["L"]["groups"]
                      branches: Branches.Initial
                      expression: Branches.MergeAll<
                          S["L"]["branches"],
                          S["L"]["expression"]
                      >
                      bounds: S["L"]["bounds"]
                  }>
                  R: S["R"]
              }>,
              Dict
          >
        : ErrorState<S, "Missing ).">

    type FinalizeState<S extends State> = {} extends S["L"]["bounds"]
        ? S
        : S["L"]["expression"] extends Bounds.T.Boundable
        ? S
        : ErrorState<
              S,
              `Bounded expression '${TreeToString<
                  S["L"]["expression"]
              >}' must be a number-or-string-typed keyword or a list-typed expression.`
          >

    export type ParseFinalizing<S extends State> =
        S["R"]["lookahead"] extends "END"
            ? FinalizeState<S>
            : S["R"]["lookahead"] extends "?"
            ? Optional.T.Parse<FinalizeState<S>>
            : S["R"]["lookahead"] extends Error<string>
            ? StateFrom<{
                  L: SetExpression<S["L"], S["R"]["lookahead"]>
                  R: S["R"]
              }>
            : ErrorState<S, `Unexpected suffix token ${S["R"]["lookahead"]}.`>

    type SuffixToken = "END" | "?" | Bounds.T.Token | Error<string>

    export type SetExpression<L extends Left, Token extends string> = LeftFrom<{
        groups: L["groups"]
        branches: L["branches"]
        expression: Token
        bounds: L["bounds"]
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
        groups: L["groups"]
        branches: L["branches"]
        expression: [L["expression"], Token]
        bounds: L["bounds"]
    }>
}
