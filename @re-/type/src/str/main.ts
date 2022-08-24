import { Node, Parser } from "./common.js"
import { ParseOperand, parseOperand } from "./operand/index.js"
import {
    Bound,
    Branches,
    Operator,
    operator,
    Optional
} from "./operator/index.js"

export const parse: Parser.ParseFn<string> = (def, ctx) =>
    loop(parseOperand(new Parser.state(def), ctx), ctx)

export type Parse<Def extends string, Dict> = Loop<
    ParseOperand<Parser.State.New<Def>, Dict>,
    Dict
>

const loop = (s: Parser.state, ctx: Node.context): Node.base => {
    while (!s.isSuffixable()) {
        next(s, ctx)
    }
    return suffixLoop(transitionToSuffix(s), ctx)
}

type Loop<S extends Parser.State, Dict> = S["L"]["nextSuffix"] extends string
    ? // We just checked that nextSuffix is a string, so this is safe.
      // @ts-ignore There are ways to get TS to infer that, but they're more expensive.
      SuffixLoop<TransitionToSuffix<S>>
    : Loop<Next<S, Dict>, Dict>

const next = (s: Parser.state, ctx: Node.context): Parser.state =>
    s.hasRoot() ? operator(s, ctx) : parseOperand(s, ctx)

type Next<S extends Parser.State, Dict> = S["L"]["root"] extends undefined
    ? ParseOperand<S, Dict>
    : Operator<S>

export const unclosedGroupMessage = "Missing )."
type UnclosedGroupMessage = typeof unclosedGroupMessage

export const transitionToSuffix = (s: Parser.state<Parser.left.suffixable>) => {
    if (s.l.groups.length) {
        return Parser.state.error(unclosedGroupMessage)
    }
    return Branches.mergeAll(s) as Parser.state.suffix
}

export type TransitionToSuffix<S extends Parser.State<Parser.Left.Suffixable>> =
    S["L"]["groups"] extends []
        ? Parser.State.From<{
              L: Parser.Left.SuffixFrom<{
                  bounds: S["L"]["bounds"]
                  root: Branches.MergeAll<S["L"]["branches"], S["L"]["root"]>
                  nextSuffix: S["L"]["nextSuffix"]
              }>
              R: S["R"]
          }>
        : Parser.State.Error<UnclosedGroupMessage>

export const suffixLoop = (
    s: Parser.state.suffix,
    ctx: Node.context
): Node.base => {
    if (s.l.nextSuffix === "END") {
        return s.l.root
    }
    if (s.l.nextSuffix === "?") {
        if (s.r.lookahead === "END") {
            return new Optional.node(s.l.root, ctx)
        }
        throw new Error(`Suffix '?' is only valid at the end of a definition.`)
    }
    if (Parser.Tokens.inTokenSet(s.l.nextSuffix, Bound.tokens)) {
        return suffixLoop(Bound.parseRight(s, s.l.nextSuffix, ctx), ctx)
    }
    throw new Error(`Unexpected suffix token '${s.l.nextSuffix}'.`)
}

export type SuffixLoop<S extends Parser.State.Of<Parser.Left.Suffix>> =
    S["L"]["nextSuffix"] extends "END"
        ? ExtractFinalizedRoot<S["L"]>
        : SuffixLoop<NextSuffix<S>>

export type NextSuffix<S extends Parser.State.Of<Parser.Left.Suffix>> =
    S["L"]["nextSuffix"] extends "?"
        ? S["R"] extends ""
            ? Parser.State.From<{
                  L: Parser.Left.SuffixFrom<{
                      bounds: S["L"]["bounds"]
                      root: [S["L"]["root"], "?"]
                      nextSuffix: "END"
                  }>
                  R: ""
              }>
            : Parser.State.Error<`Suffix '?' is only valid at the end of a definition.`>
        : S["L"]["nextSuffix"] extends Bound.Comparator
        ? Bound.ParseRight<S, S["L"]["nextSuffix"]>
        : Parser.State.Error<`Unexpected suffix token '${S["L"]["nextSuffix"]}'.`>

export type ExtractFinalizedRoot<L extends Parser.Left.Suffix> =
    Bound.IsUnpairedLeftBound<L["bounds"]> extends true
        ? Parser.Tokens.ErrorToken<Bound.UnpairedLeftBoundMessage>
        : L["root"]
