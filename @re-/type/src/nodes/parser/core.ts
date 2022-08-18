import { Base } from "../base/index.js"
import {
    Bound,
    Branches,
    Group,
    Intersection,
    List,
    OptionalNode,
    Union
} from "../nonTerminal/index.js"
import { Terminal } from "../terminal/index.js"
import { Left, State } from "./state.js"
import {
    EnclosedBaseStartChar,
    enclosedBaseStartChars,
    ErrorToken,
    inTokenSet,
    SuffixToken
} from "./tokens.js"

export type Context = Base.Parsing.Context

export type Scan<
    First extends string,
    Unscanned extends string
> = `${First}${Unscanned}`

export namespace Core {
    export const parse = (def: string, ctx: Context) => {
        const S = State.initialize(def)
        return loop(S, ctx)
    }

    export type Parse<Def extends string, Dict> = Loop<
        Base<State.Initialize<Def>, Dict>,
        Dict
    >

    const loop = (S: State.V, ctx: Context) => {
        while (S.r.lookahead !== undefined) {
            next(S, ctx)
        }
        return S.l.root
    }

    type Loop<S extends State.T, Dict> = S extends State.Suffixable
        ? Suffix<S>
        : Loop<Next<S, Dict>, Dict>

    const next = (s: State.V, ctx: Context) =>
        s.l.root === undefined
            ? base(s, ctx)
            : operator(s as State.WithRoot, ctx)

    type Next<S extends State.T, Dict> = S["L"]["root"] extends undefined
        ? Base<S, Dict>
        : Operator<S>

    const expressionExpectedMessage = `Expected an expression.`
    type ExpressionExpectedMessage = typeof expressionExpectedMessage

    const base = (s: State.V, ctx: Context): void => {
        const lookahead = s.r.shift()
        if (lookahead === "(") {
            Group.reduceOpen(s)
        } else if (inTokenSet(lookahead, enclosedBaseStartChars)) {
            Terminal.enclosedBase(s, lookahead)
        } else if (lookahead === " ") {
            base(s, ctx)
        } else if (lookahead === undefined) {
            throw new Error(expressionExpectedMessage)
        } else {
            Terminal.unenclosedBase(s, ctx)
        }
    }

    export type Base<S extends State.T, Dict> = S["R"] extends Scan<
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
        : State.Error<ExpressionExpectedMessage>

    const operator = (s: State.WithRoot, ctx: Context): void => {
        const lookahead = s.r.shift()
        // TODO: Test perf vs if block
        switch (lookahead) {
            case undefined:
                return finalize(s, ctx)
            case "?":
                return finalize(s, ctx)
            case "[":
                return List.shiftReduce(s, ctx)
            case "|":
                return Union.reduce(s, ctx)
            case "&":
                return Intersection.reduce(s, ctx)
            case ")":
                return Group.reduceClose(s)
            case " ":
                return operator(s, ctx)
            default:
                if (inTokenSet(lookahead, Bound.chars)) {
                    return Bound.shiftReduce(s, lookahead)
                }
                throw new Error(unexpectedCharacterMessage(lookahead))
        }
    }

    type Operator<S extends State.T> = S["R"] extends Scan<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "?"
            ? State.From<{ L: TransitionToSuffix<S["L"], "?">; R: Unscanned }>
            : Lookahead extends "["
            ? List.ShiftReduce<S, Unscanned>
            : Lookahead extends "|"
            ? State.From<{ L: Union.Reduce<S["L"]>; R: Unscanned }>
            : Lookahead extends "&"
            ? State.From<{ L: Intersection.Reduce<S["L"]>; R: Unscanned }>
            : Lookahead extends ")"
            ? State.From<{ L: Group.ReduceClose<S["L"]>; R: Unscanned }>
            : Lookahead extends Bound.Char
            ? Bound.ShiftReduce<S, Lookahead, Unscanned>
            : Lookahead extends " "
            ? Operator<State.ScanTo<S, Unscanned>>
            : State.Error<UnexpectedCharacterMessage<Lookahead>>
        : State.From<{ L: TransitionToSuffix<S["L"], "">; R: "" }>

    const unexpectedCharacterMessage = <Char extends string>(
        char: Char
    ): UnexpectedCharacterMessage<Char> => `Unexpected character '${char}'.`

    type UnexpectedCharacterMessage<Char extends string> =
        `Unexpected character '${Char}'.`

    export const unenclosedGroupMessage = "Missing )."
    type UnclosedGroupMessage = typeof unenclosedGroupMessage

    const finalize = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.l.groups.length) {
            throw new Error(unenclosedGroupMessage)
        }
        Branches.mergeAll(s)
        Bound.finalize(s)
        applyFinalizer(s, ctx)
    }

    type Z = Parse<"number<7", {}>

    export type TransitionToSuffix<
        L extends Left.T,
        FirstSuffix extends Left.SuffixToken
    > = L["groups"] extends []
        ? Left.From<{
              bounds: L["bounds"]
              groups: []
              branches: {}
              root: Branches.MergeAll<L["branches"], L["root"]>
              nextSuffix: FirstSuffix
          }>
        : Left.Error<UnclosedGroupMessage>

    const applyFinalizer = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.r.lookahead === undefined) {
            return
        }
        if (s.r.lookahead === "?") {
            s.l.root = new OptionalNode(s.l.root, ctx)
        }
    }

    /**
     * An empty string indicates S["L"]["Root"] is ready to return, and
     * therefore should contain either the tree resulting from a valid parse
     * of the full input or an error.
     */
    export type Suffix<S extends State.Suffix> = S["L"]["nextSuffix"] extends ""
        ? S["L"]["root"]
        : S["L"]["nextSuffix"] extends "?"
        ? S["R"] extends ""
            ? [S["L"]["root"], "?"]
            : ErrorToken<`Suffix '?' is only valid at the end of a definition.`>
        : S["L"]["nextSuffix"] extends Bound.Token
        ? Suffix<Bound.ParseRight<S, S["L"]["nextSuffix"]>>
        : ErrorToken<`Unexpected suffix token '${S["L"]["nextSuffix"]}'.`>
}
