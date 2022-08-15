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
        Get<ParseDefinition<Def, Dict>, "L">,
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
    > = S["L"]["root"] extends ErrorToken<string>
        ? S
        : S["L"]["root"] extends undefined
        ? ParseExpression<Base<S, Dict>, Dict>
        : S["R"] extends ""
        ? State.From<{
              L: ValidateFinal<{
                  bounds: S["L"]["bounds"]
                  groups: S["L"]["groups"]
                  branches: {}
                  root: Branches.MergeAll<S["L"]["branches"], S["L"]["root"]>
              }>
              R: ""
          }>
        : S["R"] extends "?"
        ? State.From<{
              L: ValidateFinal<{
                  bounds: S["L"]["bounds"]
                  groups: S["L"]["groups"]
                  branches: {}
                  root: [
                      Branches.MergeAll<S["L"]["branches"], S["L"]["root"]>,
                      "?"
                  ]
              }>
              R: ""
          }>
        : ParseExpression<Operator<S>, Dict>

    type Base<S extends State.Type, Dict> = S["R"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? State.Expression<Group.ReduceOpen<S["L"]>, Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<S, Next>
            : Next extends " "
            ? Base<State.Expression<S["L"], Rest>, Dict>
            : UnenclosedBase<S, Next, Rest, Dict>
        : State.Error<S, `Expected an expression.`>

    type Operator<S extends State.Type> = S["R"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "["
            ? Rest extends Scan<"]", infer Remaining>
                ? State.Expression<
                      State.SetTreeRoot<S["L"], [S["L"]["root"], "[]"]>,
                      Remaining
                  >
                : State.Error<S, `Missing expected ']'.`>
            : Next extends "|"
            ? State.Expression<Union.Reduce<S["L"]>, Rest>
            : Next extends "&"
            ? State.Expression<Intersection.Reduce<S["L"]>, Rest>
            : Next extends ")"
            ? State.Expression<Group.ReduceClose<S["L"]>, Rest>
            : Next extends Bound.Char
            ? ParseBound<State.ScanTo<S, Rest>, Next>
            : Next extends " "
            ? Operator<State.ScanTo<S, Rest>>
            : Next extends "?"
            ? State.Error<
                  S,
                  `Suffix '?' is only valid at the end of a definition.`
              >
            : State.Error<S, `Unexpected operator '${Next}'.`>
        : S

    type ParseBound<
        S extends State.Type,
        Start extends Bound.Char
    > = S["R"] extends Scan<infer Next, infer Rest>
        ? Next extends "="
            ? State.From<{ L: ReduceBound<S["L"], `${Start}=`>; R: Rest }>
            : Start extends ">" | "<"
            ? State.From<{ L: ReduceBound<S["L"], Start>; R: S["R"] }>
            : State.Error<S, `= is not a valid comparator. Use == instead.`>
        : State.Error<S, `Expected a bound condition after ${Start}.`>

    type ReduceBound<
        Tree extends State.Tree,
        Token extends Bound.Token
    > = Tree["root"] extends NumberLiteralDefinition
        ? ReduceLeftBound<Tree, [Tree["root"], Token]>
        : ReduceRightBound<Tree, Token>

    type ReduceLeftBound<
        Tree extends State.Tree,
        Left extends Bound.RawLeft
    > = {
        bounds: {}
        groups: []
        branches: {}
        root: any
    } extends Tree
        ? State.TreeFrom<{
              groups: []
              branches: {}
              root: undefined
              bounds: { left: Left }
          }>
        : State.ErrorTree<`Left bound '${Left[0]}${Left[1]}...' must occur at the beginning of the definition.`>

    type ReduceRightBound<
        Tree extends State.Tree,
        Token extends Bound.Token
    > = "rightToken" extends keyof Tree["bounds"]
        ? State.ErrorTree<`Definitions may have at most one right bound.`>
        : State.TreeFrom<{
              bounds: {
                  left: Tree["bounds"]["left"]
                  bounded: Tree["root"]
                  rightToken: Token
              }
              groups: Tree["groups"]
              branches: Tree["branches"]
              root: undefined
          }>

    type EnclosedBase<
        S extends State.Type,
        Enclosing extends EnclosedBaseStartChar
    > = S["R"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
        ? State.Expression<
              State.SetTreeRoot<S["L"], `${Enclosing}${Contents}${Enclosing}`>,
              Rest
          >
        : State.Error<S, `${S["R"]} requires a closing ${Enclosing}.`>

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
        ? State.Expression<State.SetTreeRoot<S["L"], Fragment>, Unscanned>
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

    type ValidateFinal<Tree extends State.Tree> = Tree["groups"] extends []
        ? Tree
        : State.SetTreeRoot<Tree, ErrorToken<UnclosedGroupMessage>>

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
