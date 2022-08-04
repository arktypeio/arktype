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
import { Lexer } from "./lexer.js"
import { ParserState } from "./state.js"
import { ErrorToken, SuffixToken, suffixTokens } from "./tokens.js"

export namespace Core {
    export type Parse<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "L">,
        "root"
    >

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = ParserState.initialize(def)
        parsePossiblePrefixes(s, ctx)
        parseExpression(s, ctx)
        reduceExpression(s)
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
        if (
            ParserState.rootIs(s, NumberLiteralNode) &&
            ParserState.lookaheadIn(s, Bound.tokens)
        ) {
            Bound.parseLeft(s)
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

    /**
     * When at runtime we would throw a ParseError, we either:
     * 1. Shift an ErrorToken from the Lexer
     * 2. Set the State's root to an ErrorToken and lookahead to "ERR"
     *
     * Suffix parsing is responsible for converting lexical errors (1) into errors
     * we can propagate as a parse result (2).
     *
     */
    type ParseExpression<
        S extends ParserState.Type,
        Dict
    > = S["R"]["lookahead"] extends SuffixToken | "ERR" | ErrorToken<string>
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

    export const UNCLOSED_GROUP_MESSAGE = "Missing )."
    type UnclosedGroupMessage = typeof UNCLOSED_GROUP_MESSAGE

    type ReduceExpression<S extends ParserState.Type> =
        S["R"]["lookahead"] extends "ERR"
            ? S
            : ValidateExpression<
                  ParserState.From<{
                      L: {
                          groups: S["L"]["groups"]
                          branches: {}
                          root: Branches.MergeAll<
                              S["L"]["branches"],
                              S["L"]["root"]
                          >
                          ctx: S["L"]["ctx"]
                      }
                      R: S["R"]
                  }>
              >

    const reduceExpression = (s: ParserState.Value) => {
        Branches.mergeAll(s)
        validateExpression(s)
    }

    type ValidateExpression<S extends ParserState.Type> =
        S["L"]["groups"] extends []
            ? S
            : ParserState.Error<S, UnclosedGroupMessage>

    const validateExpression = (s: ParserState.Value) => {
        if (s.groups.length) {
            throw new Error(UNCLOSED_GROUP_MESSAGE)
        }
    }

    type ParseSuffixes<S extends ParserState.Type> =
        S["R"]["lookahead"] extends "END"
            ? ValidateEndState<S>
            : S["R"]["lookahead"] extends "ERR"
            ? S
            : ParseSuffixes<ParseSuffix<S>>

    const parseSuffixes = (
        s: ParserState.WithRoot,
        ctx: Base.Parsing.Context
    ) => {
        while (s.scanner.lookahead !== "END") {
            parseSuffix(s, ctx)
        }
        validateEndState(s)
    }

    type UnexpectedSuffixMessage<Lookahead extends string> =
        `Unexpected suffix token '${Lookahead}'.`

    export const unexpectedSuffixMessage = <Lookahead extends string>(
        lookahead: Lookahead
    ): UnexpectedSuffixMessage<Lookahead> =>
        `Unexpected suffix token '${lookahead}'.`

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
            : ParserState.Error<S, UnexpectedSuffixMessage<S["R"]["lookahead"]>>

    const parseSuffix = (
        s: ParserState.WithRoot,
        ctx: Base.Parsing.Context
    ) => {
        if (s.scanner.lookahead === "?") {
            Optional.parse(s, ctx)
        } else if (ParserState.lookaheadIn(s, Bound.tokens)) {
            Bound.parseRight(s, ctx)
        } else {
            throw new Error(unexpectedSuffixMessage(s.scanner.lookahead))
        }
    }

    export const UNPAIRED_LEFT_BOUND_MESSAGE = `Left bounds are only valid when paired with right bounds.`
    type UnpairedLeftBoundMessage = typeof UNPAIRED_LEFT_BOUND_MESSAGE

    type ValidateEndState<S extends ParserState.Type> =
        "left" extends keyof S["L"]["ctx"]["bounds"]
            ? "right" extends keyof S["L"]["ctx"]["bounds"]
                ? S
                : ParserState.Error<S, UnpairedLeftBoundMessage>
            : S

    const validateEndState = (s: ParserState.Value) => {
        if (s.bounds.left && !s.bounds.right) {
            throw new Error(UNPAIRED_LEFT_BOUND_MESSAGE)
        }
    }
}
