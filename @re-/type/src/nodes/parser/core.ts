import { Get } from "@re-/tools"
import { Base } from "../index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import {
    Bounds,
    Group,
    Intersection,
    List,
    Optional,
    Union
} from "../nonTerminal/index.js"
import {
    NumberLiteralDefinition,
    NumberLiteralNode,
    Terminal
} from "../terminal/index.js"
import { Lexer } from "./lexer.js"
import { ParseError } from "./shared.js"
import { ParserState } from "./state.js"

export namespace Core {
    export type Parse<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "L">,
        "root"
    >

    type ParseDefinition<Def extends string, Dict> = ParsePrefix<
        ParserState.Initialize<Def>,
        Dict
    >

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = ParserState.initialize(def)
        parsePrefix(s, ctx)
        return s.root!
    }

    type ParsePrefix<
        S extends ParserState.Type,
        Dict
    > = S["R"]["lookahead"] extends NumberLiteralDefinition
        ? Bounds.ParsePossibleLeftBound<
              ParserState.From<{
                  L: S["L"]
                  R: Lexer.ShiftOperator<S["R"]["unscanned"]>
              }>,
              S["R"]["lookahead"],
              Dict
          >
        : ParseMain<S, Dict>

    const parsePrefix = (s: ParserState.Value, ctx: Base.Parsing.Context) => {
        if (NumberLiteralNode.matches(s.scanner.lookahead)) {
        }
    }

    export type ParseMain<
        S extends ParserState.Type,
        Dict
    > = S["R"]["lookahead"] extends SuffixToken
        ? ParseSuffixes<S>
        : ParseMain<ParseNext<S, Dict>, Dict>

    type ParseNext<
        S extends ParserState.Type,
        Dict
    > = S["R"]["lookahead"] extends "[]"
        ? List.Parse<S>
        : S["R"]["lookahead"] extends "|"
        ? Union.Parse<S>
        : S["R"]["lookahead"] extends "&"
        ? Intersection.Parse<S>
        : S["R"]["lookahead"] extends "("
        ? Group.ParseOpen<S>
        : S["R"]["lookahead"] extends ")"
        ? Group.ParseClose<S>
        : Terminal.Parse<S, Dict>

    type ParseSuffixes<S extends ParserState.Type> =
        S["L"]["root"] extends ParseError<string>
            ? S
            : S["L"]["groups"] extends []
            ? Bounds.ParsePossibleRightBound<{
                  L: {
                      groups: []
                      branches: {}
                      root: Branches.MergeAll<
                          S["L"]["branches"],
                          S["L"]["root"]
                      >
                      ctx: S["L"]["ctx"]
                  }
                  R: S["R"]
              }>
            : ParserState.Error<S, "Missing ).">

    type FinalizeState<S extends ParserState.Type> =
        {} extends S["L"]["ctx"]["bounds"] ? S : Bounds.AssertBoundable<S>

    export type ParseFinalizing<S extends ParserState.Type> =
        S["R"]["lookahead"] extends "END"
            ? FinalizeState<S>
            : S["R"]["lookahead"] extends "?"
            ? Optional.Parse<FinalizeState<S>>
            : S["R"]["lookahead"] extends ParseError<string>
            ? ParserState.From<{
                  L: ParserState.SetRoot<S["L"], S["R"]["lookahead"]>
                  R: S["R"]
              }>
            : ParserState.Error<
                  S,
                  `Unexpected suffix token ${S["R"]["lookahead"]}.`
              >

    type SuffixToken = "END" | "?" | Bounds.Token | ParseError<string>
}
