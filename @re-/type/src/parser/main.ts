import { base, Base } from "../base/index.js"
import { Node } from "../common.js"
import {
    Bound,
    Branches,
    Operator,
    operator,
    OptionalNode
} from "../operator/index.js"
import { left, Left, State, state, Tokens } from "./index.js"

export const parse: Node.ParseFn<string> = (def, ctx) =>
    loop(base(new state(def), ctx), ctx)

export type Parse<Def extends string, Dict> = Loop<
    Base<State.New<Def>, Dict>,
    Dict
>

const loop = (s: state, ctx: Node.Context): Node.Base => {
    while (!s.isSuffixable()) {
        next(s, ctx)
    }
    return suffixLoop(transitionToSuffix(s), ctx)
}

type Loop<S extends State, Dict> = S["L"]["nextSuffix"] extends string
    ? // We just checked that nextSuffix is a string, so this is safe.
      // @ts-ignore There are ways to get TS to infer that, but they're more expensive.
      SuffixLoop<TransitionToSuffix<S>>
    : Loop<Next<S, Dict>, Dict>

const next = (s: state, ctx: Node.Context): state =>
    s.hasRoot() ? operator(s, ctx) : base(s, ctx)

type Next<S extends State, Dict> = S["L"]["root"] extends undefined
    ? Base<S, Dict>
    : Operator<S>

export const unclosedGroupMessage = "Missing )."
type UnclosedGroupMessage = typeof unclosedGroupMessage

export const transitionToSuffix = (s: state<left.suffixable>) => {
    if (s.l.groups.length) {
        return state.error(unclosedGroupMessage)
    }
    return Branches.mergeAll(s) as state<left.suffix>
}

export type TransitionToSuffix<S extends State<Left.Suffixable>> =
    S["L"]["groups"] extends []
        ? State.From<{
              L: Left.SuffixFrom<{
                  bounds: S["L"]["bounds"]
                  root: Branches.MergeAll<S["L"]["branches"], S["L"]["root"]>
                  nextSuffix: S["L"]["nextSuffix"]
              }>
              R: S["R"]
          }>
        : State.Error<UnclosedGroupMessage>

export const suffixLoop = (
    s: state<left.suffix>,
    ctx: Node.Context
): Node.Base => {
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
        return suffixLoop(Bound.parseRight(s, s.l.nextSuffix, ctx), ctx)
    }
    throw new Error(`Unexpected suffix token '${s.l.nextSuffix}'.`)
}

export type SuffixLoop<S extends State.Of<Left.Suffix>> =
    S["L"]["nextSuffix"] extends "END"
        ? ExtractFinalizedRoot<S["L"]>
        : SuffixLoop<NextSuffix<S>>

export type NextSuffix<S extends State.Of<Left.Suffix>> =
    S["L"]["nextSuffix"] extends "?"
        ? S["R"] extends ""
            ? State.From<{
                  L: Left.SuffixFrom<{
                      bounds: S["L"]["bounds"]
                      root: [S["L"]["root"], "?"]
                      nextSuffix: "END"
                  }>
                  R: ""
              }>
            : State.Error<`Suffix '?' is only valid at the end of a definition.`>
        : S["L"]["nextSuffix"] extends Bound.Token
        ? Bound.ParseRight<S, S["L"]["nextSuffix"]>
        : State.Error<`Unexpected suffix token '${S["L"]["nextSuffix"]}'.`>

export type ExtractFinalizedRoot<L extends Left.Suffix> =
    Bound.IsUnpairedLeftBound<L["bounds"]> extends true
        ? Tokens.ErrorToken<Bound.UnpairedLeftBoundMessage>
        : L["root"]
