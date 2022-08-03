import { Get } from "@re-/tools"
import { Base } from "../base/index.js"
import {
    Bounds,
    Branches,
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

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = ParserState.initialize(def)
        parsePrefix(s, ctx)
        return s.root!
    }

    type ParseDefinition<Def extends string, Dict> = ParseMain<
        ParsePrefix<ParserState.Initialize<Def>>,
        Dict
    >

    type ParsePrefix<S extends ParserState.Type> =
        S["R"]["lookahead"] extends NumberLiteralDefinition
            ? ParsePossibleLeftBound<
                  ParserState.From<{
                      L: S["L"]
                      R: Lexer.ShiftOperator<S["R"]["unscanned"]>
                  }>,
                  S["R"]["lookahead"]
              >
            : S

    type ParsePossibleLeftBound<
        S extends ParserState.Type,
        N extends NumberLiteralDefinition
    > = S["R"]["lookahead"] extends Bounds.Token
        ? Bounds.ParseLeft<S, S["R"]["lookahead"], N>
        : ParserState.From<{
              L: ParserState.SetRoot<S["L"], N>
              R: S["R"]
          }>

    const parsePrefix = (s: ParserState.Value, ctx: Base.Parsing.Context) => {
        if (NumberLiteralNode.matches(s.scanner.lookahead)) {
        }
    }

    type ParseMain<
        S extends ParserState.Type,
        Dict
    > = S["R"]["lookahead"] extends SuffixToken
        ? ParseSuffixes<ReduceExpression<S>>
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

    type ReduceExpression<S extends ParserState.Type> =
        S["L"]["root"] extends ParseError<string>
            ? S
            : S["L"]["groups"] extends []
            ? ParserState.From<{
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

    type ParseSuffixes<S extends ParserState.Type> =
        S["R"]["lookahead"] extends "END"
            ? ValidateFinalState<S>
            : ParseSuffixes<ParseNextSuffix<S>>

    type ParseNextSuffix<S extends ParserState.Type> =
        S["R"]["lookahead"] extends "?"
            ? Optional.Parse<S>
            : S["R"]["lookahead"] extends Bounds.Token
            ? Bounds.ParseRight<
                  ParserState.From<{
                      L: S["L"]
                      R: Lexer.ShiftBase<S["R"]["unscanned"]>
                  }>,
                  S["R"]["lookahead"]
              >
            : S["R"]["lookahead"] extends ParseError<infer Message>
            ? ParserState.Error<S, Message>
            : ParserState.Error<
                  S,
                  `Unexpected suffix token ${S["R"]["lookahead"]}.`
              >

    type ValidateFinalState<S extends ParserState.Type> =
        {} extends S["L"]["ctx"]["bounds"] ? S : Bounds.AssertBoundable<S>

    type SuffixToken = "END" | "?" | Bounds.Token | ParseError<string>
}
