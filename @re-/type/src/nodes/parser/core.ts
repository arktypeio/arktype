import { Get } from "@re-/tools"
import { Branches } from "../nonTerminal/branch/branch.js"
import {
    Bounds,
    Group,
    Intersection,
    List,
    Optional,
    Union
} from "../nonTerminal/index.js"
import { NumberLiteralDefinition } from "../terminal/index.js"
import { ParseError } from "./shared.js"
import type { Shift } from "./shift.js"
import { ParserState } from "./state.js"

export namespace CoreParser {
    export type Parse<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "L">,
        "expression"
    >

    type ParseDefinition<Def extends string, Dict> = ParsePrefix<
        ParserState.Initialize<Def, Dict>,
        Dict
    >

    type ParsePrefix<
        S extends ParserState.State,
        Dict
    > = S["R"]["lookahead"] extends NumberLiteralDefinition
        ? Bounds.ParsePossibleLeftBound<
              ParserState.From<{
                  L: S["L"]
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>,
              S["R"]["lookahead"],
              Dict
          >
        : ParseMain<S, Dict>

    export type ParseMain<
        S extends ParserState.State,
        Dict
    > = S["R"]["lookahead"] extends SuffixToken
        ? ParseSuffixes<S, Dict>
        : ParseMain<ParseNext<S, Dict>, Dict>

    type ParseNext<
        S extends ParserState.State,
        Dict
    > = S["R"]["lookahead"] extends "[]"
        ? List.Parse<S>
        : S["R"]["lookahead"] extends "|"
        ? Union.Parse<S, Dict>
        : S["R"]["lookahead"] extends "&"
        ? Intersection.Parse<S, Dict>
        : S["R"]["lookahead"] extends ")"
        ? Group.ParseClose<S>
        : S["R"]["lookahead"] extends "("
        ? Group.ParseOpen<S, Dict>
        : ParserState.From<{
              L: ParserState.SetExpression<S["L"], S["R"]["lookahead"]>
              R: Shift.Operator<S["R"]["unscanned"]>
          }>

    type ParseSuffixes<
        S extends ParserState.State,
        Dict
    > = S["L"]["groups"] extends []
        ? Bounds.ParsePossibleRightBound<
              {
                  L: {
                      groups: S["L"]["groups"]
                      branches: Branches.Initial
                      expression: Branches.MergeAll<
                          S["L"]["branches"],
                          S["L"]["expression"]
                      >
                      bounds: S["L"]["bounds"]
                  }
                  R: S["R"]
              },
              Dict
          >
        : ParserState.Error<S, "Missing ).">

    type FinalizeState<S extends ParserState.State> =
        {} extends S["L"]["bounds"] ? S : Bounds.AssertBoundable<S>

    export type ParseFinalizing<S extends ParserState.State> =
        S["R"]["lookahead"] extends "END"
            ? FinalizeState<S>
            : S["R"]["lookahead"] extends "?"
            ? Optional.Parse<FinalizeState<S>>
            : S["R"]["lookahead"] extends ParseError<string>
            ? ParserState.From<{
                  L: ParserState.SetExpression<S["L"], S["R"]["lookahead"]>
                  R: S["R"]
              }>
            : ParserState.Error<
                  S,
                  `Unexpected suffix token ${S["R"]["lookahead"]}.`
              >

    type SuffixToken = "END" | "?" | Bounds.Token | ParseError<string>
}
