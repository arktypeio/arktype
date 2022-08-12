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
    EnclosedLiteralDefinition,
    NumberLiteralNode,
    Terminal
} from "../terminal/index.js"
import { Expression } from "./expression.js"
import { ErrorToken, suffixTokens } from "./tokens.js"

export namespace Core {
    export type Parse<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "tree">,
        "root"
    >

    export type ParseDefinition<Def extends string, Dict> = ParseExpression<
        Expression.T.Initial<Def>,
        Dict
    >

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = Expression.initialize(def)
        parsePossiblePrefixes(s, ctx)
        parseExpression(s, ctx)
        reduceExpression(s)
        // @ts-ignore TODO: Allow parse functions to assert their state returned.
        parseSuffixes(s, ctx)
        return s.root!
    }

    const parsePossiblePrefixes = (
        s: Expression.State,
        ctx: Base.Parsing.Context
    ) => {
        parseToken(s, ctx)
        if (Expression.rootIs(s, NumberLiteralNode)) {
            Bound.parsePossibleLeft(s)
        }
    }

    export type ParseExpression<
        S extends Expression.T.State,
        Dict
    > = S["tree"]["root"] extends ErrorToken<string>
        ? S
        : S["scanner"]["lookahead"] extends "END"
        ? ReduceExpression<S>
        : ParseExpression<ParseToken<S, Dict>, Dict>

    export type ParseToken<
        S extends Expression.T.State,
        Dict
    > = S["scanner"]["lookahead"] extends Terminal.UnenclosedToken<infer Base>
        ? Terminal.ParseUnenclosed<S, Base, Dict>
        : S["scanner"]["lookahead"] extends "[]"
        ? List.Parse<S>
        : S["scanner"]["lookahead"] extends "|"
        ? Union.Parse<S>
        : S["scanner"]["lookahead"] extends "&"
        ? Intersection.Parse<S>
        : S["scanner"]["lookahead"] extends "("
        ? Group.ParseOpen<S>
        : S["scanner"]["lookahead"] extends ")"
        ? Group.ParseClose<S>
        : S["scanner"]["lookahead"] extends EnclosedLiteralDefinition
        ? Terminal.ParseEnclosed<S, S["scanner"]["lookahead"]>
        : // TODO: Don't redunandantly remove "!""
        S["scanner"]["lookahead"] extends ErrorToken<infer Message>
        ? Expression.T.Error<S, Message>
        : Expression.T.Error<
              S,
              `Unexpected token ${S["scanner"]["lookahead"] & string}.`
          >

    const parseExpression = (
        s: Expression.State,
        ctx: Base.Parsing.Context
    ) => {
        while (!(s.scanner.lookahead in suffixTokens)) {
            parseToken(s, ctx)
        }
    }

    const parseToken = (s: Expression.State, ctx: Base.Parsing.Context) => {
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

    type ReduceExpression<S extends Expression.T.State> = ValidateExpression<{
        tree: {
            groups: S["tree"]["groups"]
            branches: {}
            root: Branches.MergeAll<S["tree"]["branches"], S["tree"]["root"]>
        }
        scanner: S["scanner"]
    }>

    const reduceExpression = (s: Expression.State) => {
        Branches.mergeAll(s)
        validateExpression(s)
    }

    type ValidateExpression<S extends Expression.T.State> =
        S["tree"]["groups"] extends []
            ? S
            : Expression.T.Error<S, UnclosedGroupMessage>

    const validateExpression = (s: Expression.State) => {
        if (s.groups.length) {
            throw new Error(UNCLOSED_GROUP_MESSAGE)
        }
    }

    const parseSuffixes = (
        s: Expression.WithRoot,
        ctx: Base.Parsing.Context
    ) => {
        while (s.scanner.lookahead !== "END") {
            parseSuffix(s, ctx)
        }
    }

    type UnexpectedSuffixMessage<Token extends string> =
        `Unexpected suffix token '${Token}'.`

    export const unexpectedSuffixMessage = <Token extends string>(
        token: Token
    ): UnexpectedSuffixMessage<Token> => `Unexpected suffix token '${token}'.`

    const parseSuffix = (s: Expression.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.scanner.lookahead === "?") {
            Optional.parse(s, ctx)
        } else if (Expression.lookaheadIn(s, Bound.tokens)) {
            Bound.parseRight(s, ctx)
        } else {
            throw new Error(unexpectedSuffixMessage(s.scanner.lookahead))
        }
    }
}
