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
import { Expression } from "./expression.js"
import {
    BaseTerminatingChar,
    EnclosedBaseStartChar,
    ErrorToken,
    suffixTokens
} from "./tokens.js"

export type Scan<
    First extends string,
    Unscanned extends string
> = `${First}${Unscanned}`

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
        : S["unscanned"] extends ""
        ? ReduceExpression<S>
        : S["tree"]["root"] extends undefined
        ? ParseExpression<Base<S, Dict>, Dict>
        : ParseExpression<Operator<S>, Dict>

    type Base<S extends Expression.T.State, Dict> = S["unscanned"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? Expression.T.From<{
                  tree: Group.ReduceOpen<S["tree"]>
                  unscanned: Rest
              }>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<S, Next>
            : Next extends " "
            ? Base<
                  Expression.T.From<{
                      tree: S["tree"]
                      unscanned: Rest
                  }>,
                  Dict
              >
            : UnenclosedBase<S, Next, Rest, Dict>
        : Expression.T.Error<S, `Expected an expression.`>

    type Operator<S extends Expression.T.State> = S["unscanned"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "["
            ? Rest extends Scan<"]", infer Remaining>
                ? Expression.T.From<{
                      tree: Expression.T.SetRoot<
                          S["tree"],
                          [S["tree"]["root"], "[]"]
                      >
                      unscanned: Remaining
                  }>
                : Expression.T.Error<S, `Missing expected ']'.`>
            : Next extends "?"
            ? Rest extends ""
                ? Expression.T.From<{
                      tree: {
                          groups: S["tree"]["groups"]
                          branches: {}
                          root: [
                              Branches.MergeAll<
                                  S["tree"]["branches"],
                                  S["tree"]["root"]
                              >,
                              "?"
                          ]
                      }

                      unscanned: ""
                  }>
                : Expression.T.Error<
                      S,
                      `Suffix '?' is only valid at the end of a definition.`
                  >
            : Next extends "|"
            ? Expression.T.From<{
                  tree: Union.Reduce<S["tree"]>
                  unscanned: Rest
              }>
            : Next extends "&"
            ? Expression.T.From<{
                  tree: Intersection.Reduce<S["tree"]>
                  unscanned: Rest
              }>
            : Next extends ")"
            ? Expression.T.From<{
                  tree: Group.ReduceClose<S["tree"]>
                  unscanned: Rest
              }>
            : Next extends " "
            ? Operator<Expression.T.From<{ tree: S["tree"]; unscanned: Rest }>>
            : Expression.T.Error<S, `Unexpected operator '${Next}'.`>
        : never

    type EnclosedBase<
        S extends Expression.T.State,
        Enclosing extends EnclosedBaseStartChar
    > = S["unscanned"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
        ? Expression.T.From<{
              tree: Expression.T.SetRoot<
                  S["tree"],
                  `${Enclosing}${Contents}${Enclosing}`
              >
              unscanned: Rest
          }>
        : Expression.T.Error<
              S,
              `${S["unscanned"]} requires a closing ${Enclosing}.`
          >

    type UnenclosedBase<
        S extends Expression.T.State,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar
            ? ValidateUnenclosed<S, Fragment, Unscanned, Dict>
            : UnenclosedBase<S, `${Fragment}${Next}`, Rest, Dict>
        : ValidateUnenclosed<S, Fragment, "", Dict>

    type ValidateUnenclosed<
        S extends Expression.T.State,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Terminal.IsResolvableUnenclosed<Fragment, Dict> extends true
        ? Expression.T.From<{
              tree: Expression.T.SetRoot<S["tree"], Fragment>
              unscanned: Unscanned
          }>
        : Expression.T.Error<
              S,
              `'${Fragment}' is not a builtin type and does not exist in your space.`
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
        unscanned: S["unscanned"]
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
