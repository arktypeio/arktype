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
import { Left, State } from "./state.js"
import { EnclosedBaseStartChar, ErrorToken, suffixTokens } from "./tokens.js"

export type Scan<
    First extends string,
    Unscanned extends string
> = `${First}${Unscanned}`

export type ScanTwo<
    First extends string,
    Second extends string,
    Unscanned extends string
> = `${First}${Second}${Unscanned}`

export namespace Core {
    export type Parse<Def extends string, Dict> = Loop<
        Base<State.Initial<Def>, Dict>,
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

    type Loop<S extends State.Base, Dict> = S extends State.Final
        ? S["L"]["root"]
        : Loop<Next<S, Dict>, Dict>

    type Next<S extends State.Base, Dict> = S["L"]["root"] extends undefined
        ? Base<S, Dict>
        : Operator<S>

    type Base<S extends State.Base, Dict> = S["R"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? State.From<{ L: Group.ReduceOpen<S["L"]>; R: Rest }>
            : Next extends EnclosedBaseStartChar
            ? Terminal.EnclosedBase<S, Next>
            : Next extends " "
            ? Base<State.ScanTo<S, Rest>, Dict>
            : Terminal.UnenclosedBase<S, Next, Rest, Dict>
        : State.Error<`Expected an expression.`>

    type Operator<S extends State.Base> = S["R"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "?"
            ? Finalize<S>
            : Next extends "["
            ? List.Parse<State.ScanTo<S, Rest>>
            : Next extends "|"
            ? State.From<{ L: Union.Reduce<S["L"]>; R: Rest }>
            : Next extends "&"
            ? State.From<{ L: Intersection.Reduce<S["L"]>; R: Rest }>
            : Next extends ")"
            ? State.From<{ L: Group.ReduceClose<S["L"]>; R: Rest }>
            : Next extends Bound.Char
            ? Bound.Parse<State.ScanTo<S, Rest>, Next>
            : Next extends " "
            ? Operator<State.ScanTo<S, Rest>>
            : State.Error<`Unexpected operator '${Next}'.`>
        : Finalize<S>

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

    type Finalize<S extends State.Base> = State.Finalize<
        ApplyFinalizer<ExtractValidatedRoot<S["L"]>, S["R"]>
    >

    type ExtractValidatedRoot<L extends Left.Base> = L["groups"] extends []
        ? {} extends L["bounds"]
            ? Branches.MergeAll<L["branches"], L["root"]>
            : ReduceBounded<L>
        : ErrorToken<UnclosedGroupMessage>

    type ReduceBounded<L extends Left.Base> = L["bounds"]["bounded"]

    type ApplyFinalizer<
        Root,
        Unscanned extends string
    > = Root extends ErrorToken<string>
        ? Root
        : Unscanned extends ""
        ? Root
        : Unscanned extends "?"
        ? [Root, "?"]
        : ErrorToken<`Suffix '?' is only valid at the end of a definition.`>

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
