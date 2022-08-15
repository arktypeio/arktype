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
    export type Parse<Def extends string, Dict> = ParseExpression<
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
        S extends State.Expression,
        Dict
    > = S extends never
        ? S
        : S["L"]["root"] extends undefined
        ? ParseExpression<Base<S, Dict>, Dict>
        : S["L"]["root"] extends ErrorToken<string>
        ? S["L"]["root"]
        : S["R"] extends "" | "?"
        ? ParseFinalizing<Finalize<S["L"]>, S["R"]>
        : ParseExpression<Operator<S>, Dict>

    type ParseFinalizing<
        Result,
        Unscanned extends "" | "?"
    > = Unscanned extends ""
        ? Result
        : Result extends ErrorToken<string>
        ? Result
        : [Result, "?"]

    type Base<S extends State.Expression, Dict> = S["R"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? State.ExpressionFrom<Group.ReduceOpen<S["L"]>, Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<S, Next>
            : Next extends " "
            ? Base<State.ExpressionFrom<S["L"], Rest>, Dict>
            : UnenclosedBase<S, Next, Rest, Dict>
        : State.Throw<S, `Expected an expression.`>

    type Operator<S extends State.Expression> = S["R"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "["
            ? Rest extends Scan<"]", infer Remaining>
                ? State.ExpressionFrom<
                      State.SetTreeRoot<S["L"], [S["L"]["root"], "[]"]>,
                      Remaining
                  >
                : State.Throw<S, `Missing expected ']'.`>
            : Next extends "|"
            ? State.ExpressionFrom<Union.Reduce<S["L"]>, Rest>
            : Next extends "&"
            ? State.ExpressionFrom<Intersection.Reduce<S["L"]>, Rest>
            : Next extends ")"
            ? State.ExpressionFrom<Group.ReduceClose<S["L"]>, Rest>
            : Next extends Bound.Char
            ? ParseBound<State.ScanTo<S, Rest>, Next>
            : Next extends " "
            ? Operator<State.ScanTo<S, Rest>>
            : Next extends "?"
            ? State.Throw<
                  S,
                  `Suffix '?' is only valid at the end of a definition.`
              >
            : State.Throw<S, `Unexpected operator '${Next}'.`>
        : S

    type ParseBound<
        S extends State.Expression,
        Start extends Bound.Char
    > = S["R"] extends Scan<infer Next, infer Rest>
        ? Next extends "="
            ? State.From<{ L: ReduceBound<S["L"], `${Start}=`>; R: Rest }>
            : Start extends ">" | "<"
            ? State.From<{ L: ReduceBound<S["L"], Start>; R: S["R"] }>
            : State.Throw<S, `= is not a valid comparator. Use == instead.`>
        : State.Throw<S, `Expected a bound condition after ${Start}.`>

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
        S extends State.Expression,
        Enclosing extends EnclosedBaseStartChar
    > = S["R"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
        ? State.ExpressionFrom<
              State.SetTreeRoot<S["L"], `${Enclosing}${Contents}${Enclosing}`>,
              Rest
          >
        : State.Throw<S, `${S["R"]} requires a closing ${Enclosing}.`>

    type UnenclosedBase<
        S extends State.Expression,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar
            ? ValidateUnenclosed<S, Fragment, Unscanned, Dict>
            : UnenclosedBase<S, `${Fragment}${Next}`, Rest, Dict>
        : ValidateUnenclosed<S, Fragment, "", Dict>

    type ValidateUnenclosed<
        S extends State.Expression,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Terminal.IsResolvableUnenclosed<Fragment, Dict> extends true
        ? State.ExpressionFrom<State.SetTreeRoot<S["L"], Fragment>, Unscanned>
        : State.Throw<
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

    type Finalize<Tree extends State.Tree> = Tree["groups"] extends []
        ? {} extends Tree["bounds"]
            ? Branches.MergeAll<Tree["branches"], Tree["root"]>
            : ValidateBounds<Tree>
        : ErrorToken<UnclosedGroupMessage>

    type ValidateBounds<Tree extends State.Tree> = Tree["bounds"]["bounded"]

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
