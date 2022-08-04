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
import { State } from "./state.js"
import { ErrorToken, SuffixToken, suffixTokens } from "./tokens.js"

export namespace Core {
    export type Parse<Def extends string, Dict> = Get<
        ParseDefinition<Def, Dict>,
        "root"
    >

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = State.initialize(def)
        parsePossiblePrefixes(s, ctx)
        parseExpression(s, ctx)
        reduceExpression(s)
        parseSuffixes(s, ctx)
        return s.root!
    }

    type ParseDefinition<Def extends string, Dict> = ParseExpression<
        ParsePrefixes<State.Initialize<Def>>,
        Dict
    >

    type ParsePrefixes<S extends State.Type> =
        S["scanner"]["lookahead"] extends NumberLiteralDefinition
            ? ParsePossibleLeftBound<
                  State.ShiftOperator<S>,
                  S["scanner"]["lookahead"]
              >
            : S

    const parsePossiblePrefixes = (
        s: State.Value,
        ctx: Base.Parsing.Context
    ) => {
        parseToken(s, ctx)
        if (
            State.rootIs(s, NumberLiteralNode) &&
            State.lookaheadIn(s, Bound.tokens)
        ) {
            Bound.parseLeft(s)
        }
    }

    type ParsePossibleLeftBound<
        S extends State.Type,
        N extends NumberLiteralDefinition
    > = S["scanner"]["lookahead"] extends Bound.Token
        ? Bound.ParseLeft<S, S["scanner"]["lookahead"], N>
        : State.SetRoot<S, N>

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
        S extends State.Type,
        Dict
    > = S["scanner"]["lookahead"] extends
        | SuffixToken
        | "ERR"
        | ErrorToken<string>
        ? ParseSuffixes<ReduceExpression<S>>
        : ParseExpression<ParseToken<S, Dict>, Dict>

    const parseExpression = (s: State.Value, ctx: Base.Parsing.Context) => {
        while (!(s.scanner.lookahead in suffixTokens)) {
            parseToken(s, ctx)
        }
    }

    type ParseToken<
        S extends State.Type,
        Dict
    > = S["scanner"]["lookahead"] extends "[]"
        ? List.Parse<S>
        : S["scanner"]["lookahead"] extends "|"
        ? Union.Parse<S>
        : S["scanner"]["lookahead"] extends "&"
        ? Intersection.Parse<S>
        : S["scanner"]["lookahead"] extends "("
        ? Group.ParseOpen<S>
        : S["scanner"]["lookahead"] extends ")"
        ? Group.ParseClose<S>
        : Terminal.Parse<S, Dict>

    const parseToken = (s: State.Value, ctx: Base.Parsing.Context) => {
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

    type ReduceExpression<S extends State.Type> =
        S["scanner"]["lookahead"] extends "ERR"
            ? S
            : ValidateExpression<
                  State.From<{
                      groups: S["groups"]
                      branches: {}
                      root: Branches.MergeAll<S["branches"], S["root"]>
                      bounds: S["bounds"]
                      scanner: S["scanner"]
                  }>
              >

    const reduceExpression = (s: State.Value) => {
        Branches.mergeAll(s)
        validateExpression(s)
    }

    type ValidateExpression<S extends State.Type> = S["groups"] extends []
        ? S
        : State.Error<S, UnclosedGroupMessage>

    const validateExpression = (s: State.Value) => {
        if (s.groups.length) {
            throw new Error(UNCLOSED_GROUP_MESSAGE)
        }
    }

    type ParseSuffixes<S extends State.Type> =
        S["scanner"]["lookahead"] extends "END"
            ? ValidateEndState<S>
            : S["scanner"]["lookahead"] extends "ERR"
            ? S
            : ParseSuffixes<ParseSuffix<S>>

    const parseSuffixes = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
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

    type ParseSuffix<S extends State.Type> =
        S["scanner"]["lookahead"] extends "?"
            ? Optional.Parse<S>
            : S["scanner"]["lookahead"] extends Bound.Token
            ? Bound.ParseRight<State.ShiftBase<S>, S["scanner"]["lookahead"]>
            : S["scanner"]["lookahead"] extends ErrorToken<infer Message>
            ? State.Error<S, Message>
            : State.Error<S, UnexpectedSuffixMessage<S["scanner"]["lookahead"]>>

    const parseSuffix = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.scanner.lookahead === "?") {
            Optional.parse(s, ctx)
        } else if (State.lookaheadIn(s, Bound.tokens)) {
            Bound.parseRight(s, ctx)
        } else {
            throw new Error(unexpectedSuffixMessage(s.scanner.lookahead))
        }
    }

    export const UNPAIRED_LEFT_BOUND_MESSAGE = `Left bounds are only valid when paired with right bounds.`
    type UnpairedLeftBoundMessage = typeof UNPAIRED_LEFT_BOUND_MESSAGE

    type ValidateEndState<S extends State.Type> =
        "left" extends keyof S["bounds"]
            ? "right" extends keyof S["bounds"]
                ? S
                : State.Error<S, UnpairedLeftBoundMessage>
            : S

    const validateEndState = (s: State.Value) => {
        if (s.bounds.left && !s.bounds.right) {
            throw new Error(UNPAIRED_LEFT_BOUND_MESSAGE)
        }
    }
}
