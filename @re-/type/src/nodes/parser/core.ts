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
    export const parse = (def: string, ctx: Context): Base.Node => {
        const s = State.initialize(def)
        base(s, ctx)
        return loop(s, ctx)
    }

    export type Parse<Def extends string, Dict> = Loop<
        Base<State.Initialize<Def>, Dict>,
        Dict
    >

    const loop = (s: State.V, ctx: Context): Base.Node => {
        while (!State.isSuffixable(s)) {
            next(s, ctx)
        }
        return suffix(s, ctx)
    }

    type Loop<S extends State.T, Dict> = S extends State.Suffixable
        ? Suffix<S>
        : Loop<Next<S, Dict>, Dict>

    const next = (s: State.V, ctx: Context): State.V =>
        s.l.root ? operator(s as State.WithRoot, ctx) : base(s, ctx)

    type Next<S extends State.T, Dict> = S["L"]["root"] extends undefined
        ? Base<S, Dict>
        : Operator<S>

    const expressionExpectedMessage = `Expected an expression.`
    type ExpressionExpectedMessage = typeof expressionExpectedMessage

    const base = (s: State.V, ctx: Context): State.V => {
        const lookahead = s.r.shift()
        return lookahead === "("
            ? Group.reduceOpen(s)
            : inTokenSet(lookahead, enclosedBaseStartChars)
            ? Terminal.enclosedBase(s, lookahead)
            : lookahead === " "
            ? base(s, ctx)
            : lookahead === "END"
            ? State.errorFrom(expressionExpectedMessage)
            : Terminal.unenclosedBase(s, ctx)
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
        : State.ErrorFrom<ExpressionExpectedMessage>

    const operator = (s: State.WithRoot, ctx: Context): State.V => {
        const lookahead = s.r.shift()
        return lookahead === "END"
            ? transitionToSuffix(s, "END")
            : lookahead === "?"
            ? transitionToSuffix(s, "?")
            : lookahead === "["
            ? List.shiftReduce(s, ctx)
            : lookahead === "|"
            ? Union.reduce(s, ctx)
            : lookahead === "&"
            ? Intersection.reduce(s, ctx)
            : lookahead === ")"
            ? Group.reduceClose(s)
            : inTokenSet(lookahead, Bound.chars)
            ? Bound.parse(s, lookahead)
            : lookahead === " "
            ? operator(s, ctx)
            : State.errorFrom(unexpectedCharacterMessage(lookahead))
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
            ? Bound.Parse<S, Lookahead, Unscanned>
            : Lookahead extends " "
            ? Operator<State.ScanTo<S, Unscanned>>
            : State.ErrorFrom<UnexpectedCharacterMessage<Lookahead>>
        : State.From<{ L: TransitionToSuffix<S["L"], "END">; R: "" }>

    const unexpectedCharacterMessage = <Char extends string>(
        char: Char
    ): UnexpectedCharacterMessage<Char> => `Unexpected character '${char}'.`

    type UnexpectedCharacterMessage<Char extends string> =
        `Unexpected character '${Char}'.`

    export const unclosedGroupMessage = "Missing )."
    type UnclosedGroupMessage = typeof unclosedGroupMessage

    export const transitionToSuffix = (
        s: State.WithRoot,
        firstSuffix: Left.SuffixToken
    ) => {
        if (s.l.groups.length) {
            return State.errorFrom(unclosedGroupMessage)
        }
        s.l.nextSuffix = firstSuffix
        return Branches.mergeAll(s) as State.SuffixV
    }

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
        : Left.ErrorFrom<UnclosedGroupMessage>

    export const suffix = (
        s: State.SuffixV,
        ctx: Base.Parsing.Context
    ): Base.Node => {
        if (s.l.nextSuffix === "END") {
            return s.l.root
        }
        if (s.l.nextSuffix === "?") {
            if (s.r.lookahead === "END") {
                return new OptionalNode(s.l.root, ctx)
            }
            throw new Error(
                `Suffix '?' is only valid at the end of a definition.`
            )
        }
        if (inTokenSet(s.l.nextSuffix, Bound.tokens)) {
            return suffix(Bound.parseRight(s, s.l.nextSuffix, ctx), ctx)
        }
        throw new Error(`Unexpected suffix token '${s.l.nextSuffix}'.`)
    }

    export type Suffix<S extends State.Suffix> =
        S["L"]["nextSuffix"] extends "END"
            ? S["L"]["root"]
            : S["L"]["nextSuffix"] extends "?"
            ? S["R"] extends ""
                ? [S["L"]["root"], "?"]
                : ErrorToken<`Suffix '?' is only valid at the end of a definition.`>
            : S["L"]["nextSuffix"] extends Bound.Token
            ? Suffix<Bound.ParseRight<S, S["L"]["nextSuffix"]>>
            : ErrorToken<`Unexpected suffix token '${S["L"]["nextSuffix"]}'.`>
}
