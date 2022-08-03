import { Get } from "@re-/tools"
import { Base } from "../base/index.js"
import {
    Bound,
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
import { ErrorToken, Lexer, SuffixToken, suffixTokens } from "./lexer.js"
import { ParserState } from "./state.js"

export namespace Core {
    export type Parse<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "L">,
        "root"
    >

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = ParserState.initialize(def)
        parsePossiblePrefixes(s, ctx)
        parseExpression(s, ctx)
        parseSuffixes(s, ctx)
        return s.root!
    }

    type ParseDefinition<Def extends string, Dict> = ParseExpression<
        ParsePrefixes<ParserState.Initialize<Def>>,
        Dict
    >

    type ParsePrefixes<S extends ParserState.Type> =
        S["R"]["lookahead"] extends NumberLiteralDefinition
            ? ParsePossibleLeftBound<
                  ParserState.From<{
                      L: S["L"]
                      R: Lexer.ShiftOperator<S["R"]["unscanned"]>
                  }>,
                  S["R"]["lookahead"]
              >
            : S

    const parsePossiblePrefixes = (
        s: ParserState.Value,
        ctx: Base.Parsing.Context
    ) => {
        parseToken(s, ctx)
        // TODO: Add a better way to do assertions like this
        if (s.root instanceof NumberLiteralNode) {
            Lexer.shiftOperator(s.scanner)
            parsePossibleLeftBound(s as ParserState.Value<NumberLiteralNode>)
        }
    }

    type ParsePossibleLeftBound<
        S extends ParserState.Type,
        N extends NumberLiteralDefinition
    > = S["R"]["lookahead"] extends Bound.Token
        ? Bound.ParseLeft<S, S["R"]["lookahead"], N>
        : ParserState.From<{
              L: ParserState.SetRoot<S["L"], N>
              R: S["R"]
          }>

    const parsePossibleLeftBound = (
        s: ParserState.Value<NumberLiteralNode>
    ) => {
        if (Bound.isToken(s.scanner.lookahead)) {
            Bound.parseLeft(s, s.scanner.lookahead)
        }
    }

    type ParseExpression<
        S extends ParserState.Type,
        Dict
    > = S["R"]["lookahead"] extends SuffixToken
        ? ParseSuffixes<ReduceExpression<S>>
        : ParseExpression<ParseToken<S, Dict>, Dict>

    const parseExpression = (
        s: ParserState.Value,
        ctx: Base.Parsing.Context
    ) => {
        while (!(s.scanner.lookahead in suffixTokens)) {
            parseToken(s, ctx)
        }
    }

    type ParseToken<
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

    const parseToken = (s: ParserState.Value, ctx: Base.Parsing.Context) => {
        switch (s.scanner.lookahead) {
            case "[]":
                return List.parse(s, ctx)
            case "|":
                return Union.parse(s, ctx)
            case "&":
                return Intersection.parse(s, ctx)
            case "(":
                return Group.parseOpen(s)
            case ")":
                return Group.parseClose(s)
            default:
                return Terminal.parse(s, ctx)
        }
    }

    type ReduceExpression<S extends ParserState.Type> =
        S["L"]["root"] extends ErrorToken<string>
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
            : ParseSuffixes<ParseSuffix<S>>

    const parseSuffixes = (s: ParserState.Value, ctx: Base.Parsing.Context) => {
        while (s.scanner.lookahead !== "END") {
            parseSuffix(s, ctx)
        }
        validateFinalState(s)
    }

    type ParseSuffix<S extends ParserState.Type> =
        S["R"]["lookahead"] extends "?"
            ? Optional.Parse<S>
            : S["R"]["lookahead"] extends Bound.Token
            ? Bound.ParseRight<
                  ParserState.From<{
                      L: S["L"]
                      R: Lexer.ShiftBase<S["R"]["unscanned"]>
                  }>,
                  S["R"]["lookahead"]
              >
            : S["R"]["lookahead"] extends ErrorToken<infer Message>
            ? ParserState.Error<S, Message>
            : ParserState.Error<
                  S,
                  `Unexpected suffix token ${S["R"]["lookahead"]}.`
              >

    const parseSuffix = (s: ParserState.Value, ctx: Base.Parsing.Context) => {
        if (s.scanner.lookahead === "?") {
            Optional.parse(s, ctx)
        } else if (s.scanner.lookahead in Bound.tokens) {
            // Need to add a bound
            Lexer.shiftOperator(Lexer.shiftBase(s.scanner))
        } else {
            throw new Error(`Unexpected suffix token ${s.scanner.lookahead}.`)
        }
    }

    type ValidateFinalState<S extends ParserState.Type> =
        "left" extends keyof S["L"]["ctx"]["bounds"]
            ? "right" extends keyof S["L"]["ctx"]["bounds"]
                ? S
                : ParserState.Error<
                      S,
                      `Left bounds are only valid when paired with right bounds.`
                  >
            : S

    const validateFinalState = (s: ParserState.Value) => {
        if (s.bounds.left && !s.bounds.right) {
            throw new Error(
                `Left bounds are only valid when paired with right bounds.`
            )
        }
    }
}
