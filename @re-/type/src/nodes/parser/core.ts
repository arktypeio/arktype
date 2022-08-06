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
import { NumberLiteralNode, Terminal } from "../terminal/index.js"
import { Affixes } from "./affix.js"
import { Expression } from "./expression.js"
import { ErrorToken, suffixTokens } from "./tokens.js"

export namespace Core {
    export type Parse<Def extends string, Dict> = Get<
        ParseDefinition<Def, Dict>,
        "root"
    >

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = Expression.State.initialize(def)
        parsePossiblePrefixes(s, ctx)
        parseExpression(s, ctx)
        reduceExpression(s)
        // @ts-ignore TODO: Allow parse functions to assert their state returned.
        parseSuffixes(s, ctx)
        return s.root!
    }

    type ParseDefinition<Def extends string, Dict> = ParseExpressionRoot<
        Affixes.Parse<Def>,
        Dict
    >

    type ParseExpressionRoot<
        S extends Affixes.State.Type,
        Dict
    > = Affixes.Apply<
        // @ts-ignore
        ParseExpression<Expression.State.Initialize<S["scanner"]>, Dict>,
        S["ctx"]
    >

    const parsePossiblePrefixes = (
        s: Expression.State.Value,
        ctx: Base.Parsing.Context
    ) => {
        parseToken(s, ctx)
        if (Expression.State.rootIs(s, NumberLiteralNode)) {
            Bound.parsePossibleLeft(s)
        }
    }

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
        S extends Expression.State.Type,
        Dict
    > = S["scanner"]["lookahead"] extends "END"
        ? ReduceExpression<S>
        : S["scanner"]["lookahead"] extends "ERR"
        ? S
        : S["scanner"]["lookahead"] extends ErrorToken<infer Message>
        ? Expression.State.Error<S, Message>
        : ParseExpression<ParseToken<S, Dict>, Dict>

    const parseExpression = (
        s: Expression.State.Value,
        ctx: Base.Parsing.Context
    ) => {
        while (!(s.scanner.lookahead in suffixTokens)) {
            parseToken(s, ctx)
        }
    }

    type ParseToken<
        S extends Expression.State.Type,
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

    const parseToken = (
        s: Expression.State.Value,
        ctx: Base.Parsing.Context
    ) => {
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

    type ReduceExpression<S extends Expression.State.Type> = ValidateExpression<
        Expression.State.From<{
            groups: S["groups"]
            branches: {
                union: []
                intersection: []
            }
            root: Union.Merge<S["branches"], S["root"]>
            scanner: S["scanner"]
        }>
    >

    const reduceExpression = (s: Expression.State.Value) => {
        Branches.mergeAll(s)
        validateExpression(s)
    }

    type ValidateExpression<S extends Expression.State.Type> =
        S["groups"] extends []
            ? S
            : Expression.State.Error<S, UnclosedGroupMessage>

    const validateExpression = (s: Expression.State.Value) => {
        if (s.groups.length) {
            throw new Error(UNCLOSED_GROUP_MESSAGE)
        }
    }

    const parseSuffixes = (
        s: Expression.State.WithRoot,
        ctx: Base.Parsing.Context
    ) => {
        while (s.scanner.lookahead !== "END") {
            parseSuffix(s, ctx)
        }
    }

    type UnexpectedSuffixMessage<Lookahead extends string> =
        `Unexpected suffix token '${Lookahead}'.`

    export const unexpectedSuffixMessage = <Lookahead extends string>(
        lookahead: Lookahead
    ): UnexpectedSuffixMessage<Lookahead> =>
        `Unexpected suffix token '${lookahead}'.`

    const parseSuffix = (
        s: Expression.State.WithRoot,
        ctx: Base.Parsing.Context
    ) => {
        if (s.scanner.lookahead === "?") {
            Optional.parse(s, ctx)
        } else if (Expression.State.lookaheadIn(s, Bound.tokens)) {
            Bound.parseRight(s, ctx)
        } else {
            throw new Error(unexpectedSuffixMessage(s.scanner.lookahead))
        }
    }
}
