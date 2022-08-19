import { Core } from "../../core/index.js"
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
import { Expression, Scanner, State, Suffix, Tokens } from "./index.js"

export const parse = (def: string, ctx: Core.Parse.Context): Core.Node => {
    const s = new State(def, new Expression())
    base(s, ctx)
    return loop(s, ctx)
}

export type Parse<Def extends string, Dict> = Loop<
    Core<State.From<Expression.Initial, Def>, Dict>,
    Dict
>

const loop = (s: State<Expression>, ctx: Core.Parse.Context): Core.Node => {
    while (!s.l.isSuffixable()) {
        next(s, ctx)
    }
    return suffix(s, ctx)
}

type Loop<S extends State.Of<Expression.T>, Dict> = Expression.IsSuffixable<
    S["L"]
> extends true
    ? SuffixLoop<S>
    : Loop<Next<S, Dict>, Dict>

const next = (
    s: State<Expression>,
    ctx: Core.Parse.Context
): State<Expression> => (s.l.root ? operator(s, ctx) : base(s, ctx))

type Next<
    S extends State.Of<Expression.T>,
    Dict
> = S["L"]["root"] extends undefined ? Core<S, Dict> : Operator<S>

const expressionExpectedMessage = `Expected an expression.`
type ExpressionExpectedMessage = typeof expressionExpectedMessage

const base = (
    s: State<Expression>,
    ctx: Core.Parse.Context
): State<Expression> => {
    const lookahead = s.r.shift()
    return lookahead === "("
        ? Group.reduceOpen(s)
        : Tokens.inTokenSet(lookahead, Tokens.enclosedBaseStartChars)
        ? Terminal.enclosedBase(s, lookahead)
        : lookahead === " "
        ? base(s, ctx)
        : lookahead === "END"
        ? s.error(expressionExpectedMessage)
        : Terminal.unenclosedBase(s, ctx)
}

export type Core<
    S extends State.Of<Expression.T>,
    Dict
> = S["R"] extends Scanner.Shift<infer Lookahead, infer Unscanned>
    ? Lookahead extends "("
        ? State.From<Group.ReduceOpen<S["L"]>, Unscanned>
        : Lookahead extends Tokens.EnclosedBaseStartChar
        ? Terminal.EnclosedBase<S, Lookahead>
        : Lookahead extends " "
        ? Core<{ L: S["L"]; R: Unscanned }, Dict>
        : Terminal.UnenclosedBase<S, Lookahead, Unscanned, Dict>
    : State.Error<ExpressionExpectedMessage>

const operator = (
    s: State<Expression>,
    ctx: Core.Parse.Context
): State<Expression> => {
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
        : Tokens.inTokenSet(lookahead, Bound.chars)
        ? Bound.parse(s, lookahead)
        : lookahead === " "
        ? operator(s, ctx)
        : s.error(unexpectedCharacterMessage(lookahead))
}

type Operator<S extends State.Of<Expression.T>> = S["R"] extends Scanner.Shift<
    infer Lookahead,
    infer Unscanned
>
    ? Lookahead extends "?"
        ? State.From<TransitionToSuffix<S["L"], "?">, Unscanned>
        : Lookahead extends "["
        ? List.ShiftReduce<S, Unscanned>
        : Lookahead extends "|"
        ? State.From<Union.Reduce<S["L"]>, Unscanned>
        : Lookahead extends "&"
        ? State.From<Intersection.Reduce<S["L"]>, Unscanned>
        : Lookahead extends ")"
        ? State.From<Group.ReduceClose<S["L"]>, Unscanned>
        : Lookahead extends Bound.Char
        ? Bound.Parse<S, Lookahead, Unscanned>
        : Lookahead extends " "
        ? Operator<{ L: S["L"]; R: Unscanned }>
        : State.Error<UnexpectedCharacterMessage<Lookahead>>
    : State.From<TransitionToSuffix<S["L"], "END">, "">

const unexpectedCharacterMessage = <Char extends string>(
    char: Char
): UnexpectedCharacterMessage<Char> => `Unexpected character '${char}'.`

type UnexpectedCharacterMessage<Char extends string> =
    `Unexpected character '${Char}'.`

export const unclosedGroupMessage = "Missing )."
type UnclosedGroupMessage = typeof unclosedGroupMessage

export const transitionToSuffix = (
    s: State<Expression>,
    firstSuffix: Tokens.SuffixToken
) => {
    if (s.l.groups.length) {
        return s.error(unclosedGroupMessage)
    }
    s.l.nextSuffix = firstSuffix
    return Branches.mergeAll(s) as State<Suffix>
}

export type TransitionToSuffix<
    L extends Expression.T,
    FirstSuffix extends Tokens.SuffixToken
> = L["groups"] extends []
    ? Expression.From<{
          bounds: L["bounds"]
          groups: []
          branches: {}
          root: Branches.MergeAll<L["branches"], L["root"]>
          nextSuffix: FirstSuffix
      }>
    : Expression.Error<UnclosedGroupMessage>

export const suffix = (
    s: State<Suffix>,
    ctx: Core.Parse.Context
): Core.Node => {
    if (s.l.nextSuffix === "END") {
        return s.l.root
    }
    if (s.l.nextSuffix === "?") {
        if (s.r.lookahead === "END") {
            return new OptionalNode(s.l.root, ctx)
        }
        throw new Error(`Suffix '?' is only valid at the end of a definition.`)
    }
    if (Tokens.inTokenSet(s.l.nextSuffix, Bound.tokens)) {
        return suffix(Bound.parseRight(s, s.l.nextSuffix, ctx), ctx)
    }
    throw new Error(`Unexpected suffix token '${s.l.nextSuffix}'.`)
}

export type SuffixLoop<S extends State.Of<Suffix.Base>> =
    S["L"]["nextSuffix"] extends "END"
        ? ExtractFinalizedRoot<S["L"]>
        : SuffixLoop<NextSuffix<S>>

export type NextSuffix<S extends State.Of<Suffix.Base>> =
    S["L"]["nextSuffix"] extends "?"
        ? S["R"] extends ""
            ? State.From<
                  {
                      bounds: S["L"]["bounds"]
                      root: [S["L"]["root"], "?"]
                      nextSuffix: "END"
                  },
                  ""
              >
            : State.Error<`Suffix '?' is only valid at the end of a definition.`>
        : S["L"]["nextSuffix"] extends Bound.Token
        ? Bound.ParseRight<S, S["L"]["nextSuffix"]>
        : State.Error<`Unexpected suffix token '${S["L"]["nextSuffix"]}'.`>

export type ExtractFinalizedRoot<L extends Suffix.Base> =
    Bound.IsUnpairedLeftBound<L["bounds"]> extends true
        ? Tokens.ErrorToken<Bound.UnpairedLeftBoundMessage>
        : L["root"]
