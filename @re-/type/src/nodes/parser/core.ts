/* eslint-disable max-lines */
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
        State.Initialize<Def>,
        Dict
    >

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = State.initialize(def)
        parsePossiblePrefixes(s, ctx)
        parseExpression(s, ctx)
        reduceExpression(s)
        // @ts-ignore TODO: Allow parse functions to assert their state returned.
        parseSuffixes(s, ctx)
        return s.root!
    }

    const parsePossiblePrefixes = (
        s: State.Value,
        ctx: Base.Parsing.Context
    ) => {
        parseToken(s, ctx)
        if (State.rootIs(s, NumberLiteralNode)) {
            Bound.parsePossibleLeft(s)
        }
    }

    export type ParseExpression<
        S extends State.Type,
        Dict
    > = S["tree"]["root"] extends ErrorToken<string>
        ? S
        : S["unscanned"] extends ""
        ? ReduceExpression<S>
        : S["affixes"]["suffixStart"] extends string
        ? ParseSuffixes<S>
        : S["tree"]["root"] extends undefined
        ? ParseExpression<Base<S, Dict>, Dict>
        : ParseExpression<Operator<S>, Dict>

    type Base<S extends State.Type, Dict> = S["unscanned"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? State.Expression<S, Group.ReduceOpen<S["tree"]>, Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<S, Next>
            : Next extends " "
            ? Base<State.Expression<S, S["tree"], Rest>, Dict>
            : UnenclosedBase<S, Next, Rest, Dict>
        : State.Error<S, `Expected an expression.`>

    type Operator<S extends State.Type> = S["unscanned"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "?"
            ? ReduceExpression<S, "?">
            : Next extends "["
            ? Rest extends Scan<"]", infer Remaining>
                ? State.Expression<
                      S,
                      State.SetRoot<S["tree"], [S["tree"]["root"], "[]"]>,
                      Remaining
                  >
                : State.Error<S, `Missing expected ']'.`>
            : Next extends "|"
            ? State.Expression<S, Union.Reduce<S["tree"]>, Rest>
            : Next extends "&"
            ? State.Expression<S, Intersection.Reduce<S["tree"]>, Rest>
            : Next extends ")"
            ? State.Expression<S, Group.ReduceClose<S["tree"]>, Rest>
            : Next extends Bound.Char
            ? ParseBound<S, Next>
            : Next extends " "
            ? Operator<State.ScanTo<S, Rest>>
            : State.Error<S, `Unexpected operator '${Next}'.`>
        : S
    type IsLeftBound<Tree extends State.Tree> = Tree extends State.TreeFrom<{
        groups: []
        branches: {}
        root: NumberLiteralDefinition
    }>
        ? true
        : false

    type ParseSuffixes<S extends State.Type> = S["unscanned"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "?"
            ? Rest extends ""
                ? State.Expression<
                      S,
                      State.SetRoot<S["tree"], [S["tree"]["root"], "?"]>,
                      Rest
                  >
                : State.Error<
                      S,
                      `Suffix '?' is only valid at the end of a definition.`
                  >
            : Next extends Bound.Char
            ? ParseBound<State.ScanTo<S, Rest>, Next>
            : State.Error<
                  S,
                  `Non-suffix token '${Next}' is not allowed after suffix '${S["affixes"]["suffixStart"]}'.`
              >
        : S

    type ParseBound<
        S extends State.Type,
        Start extends Bound.Char
    > = S["unscanned"] extends Scan<infer Next, infer Rest>
        ? Next extends "="
            ? ReduceBound<State.ScanTo<S, Rest>, `${Start}=`>
            : Start extends ">" | "<"
            ? ReduceBound<S, Start>
            : State.Error<S, `= is not a valid comparator. Use == instead.`>
        : State.Error<S, `Expected a bound condition after ${Start}.`>

    type ReduceBound<
        S extends State.Type,
        Token extends Bound.Token
    > = IsLeftBound<S["tree"]> extends true
        ? ReduceLeftBound<S, Token>
        : // TODO: Should we have dict here?
          ReduceRightBound<Base<S, {}>, S["tree"]["root"], Token>

    type ReduceLeftBound<
        S extends State.Type,
        Token extends Bound.Token
    > = "left" extends keyof S["affixes"]["bounds"]
        ? State.Error<S, `Definitions may have at most one left bound.`>
        : State.From<{
              affixes: {
                  bounds: {
                      left: [S["tree"]["root"], Token]
                  }
              }
              tree: State.InitialTree
              unscanned: S["unscanned"]
          }>

    type ReduceRightBound<
        S extends State.Type,
        OriginalRoot,
        Token extends Bound.Token
    > = "right" extends keyof S["affixes"]["bounds"]
        ? State.Error<S, `Definitions may have at most one right bound.`>
        : State.From<{
              affixes: S["affixes"] & {
                  // TODO: Improve clarity around "suffixStart" transitions
                  suffixStart: Token
                  bounds: {
                      right: [Token, S["tree"]["root"]]
                  }
              }
              tree: State.SetRoot<S["tree"], OriginalRoot>
              unscanned: S["unscanned"]
          }>

    type EnclosedBase<
        S extends State.Type,
        Enclosing extends EnclosedBaseStartChar
    > = S["unscanned"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
        ? State.Expression<
              S,
              State.SetRoot<S["tree"], `${Enclosing}${Contents}${Enclosing}`>,
              Rest
          >
        : State.Error<S, `${S["unscanned"]} requires a closing ${Enclosing}.`>

    type UnenclosedBase<
        S extends State.Type,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar
            ? ValidateUnenclosed<S, Fragment, Unscanned, Dict>
            : UnenclosedBase<S, `${Fragment}${Next}`, Rest, Dict>
        : ValidateUnenclosed<S, Fragment, "", Dict>

    type ValidateUnenclosed<
        S extends State.Type,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Terminal.IsResolvableUnenclosed<Fragment, Dict> extends true
        ? State.Expression<S, State.SetRoot<S["tree"], Fragment>, Unscanned>
        : State.Error<
              S,
              `'${Fragment}' is not a builtin type and does not exist in your space.`
          >

    const parseExpression = (s: State.Value, ctx: Base.Parsing.Context) => {
        while (!(s.scanner.lookahead in suffixTokens)) {
            parseToken(s, ctx)
        }
    }

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

    type ReduceExpression<
        S extends State.Type,
        SuffixStart extends undefined | string = undefined
    > = S["tree"]["groups"] extends []
        ? State.From<{
              affixes: S["affixes"] & { suffixStart: SuffixStart }
              tree: {
                  groups: []
                  branches: {}
                  root: Branches.MergeAll<
                      S["tree"]["branches"],
                      S["tree"]["root"]
                  >
              }
              unscanned: S["unscanned"]
          }>
        : State.Error<S, UnclosedGroupMessage>

    const reduceExpression = (s: State.Value) => {
        Branches.mergeAll(s)
        validateExpression(s)
    }

    const validateExpression = (s: State.Value) => {
        if (s.groups.length) {
            throw new Error(UNCLOSED_GROUP_MESSAGE)
        }
    }

    const parseSuffixes = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        while (s.scanner.lookahead !== "END") {
            parseSuffix(s, ctx)
        }
    }

    type UnexpectedSuffixMessage<Token extends string> =
        `Unexpected suffix token '${Token}'.`

    export const unexpectedSuffixMessage = <Token extends string>(
        token: Token
    ): UnexpectedSuffixMessage<Token> => `Unexpected suffix token '${token}'.`

    const parseSuffix = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.scanner.lookahead === "?") {
            Optional.parse(s, ctx)
        } else if (State.lookaheadIn(s, Bound.tokens)) {
            Bound.parseRight(s, ctx)
        } else {
            throw new Error(unexpectedSuffixMessage(s.scanner.lookahead))
        }
    }
}
