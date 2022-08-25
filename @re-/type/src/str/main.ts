import { Node, Parser } from "./common.js"
import { ParseOperand, parseOperand } from "./operand/index.js"
import { Operator } from "./operator/index.js"

export const parse: Node.parseFn<string> = (def, ctx) =>
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
    s.hasRoot() ? Operator.parseOperator(s, ctx) : parseOperand(s, ctx)

type Next<S extends Parser.State, Dict> = S["L"]["root"] extends undefined
    ? ParseOperand<S, Dict>
    : Operator.ParseOperator<S>

export const unclosedGroupMessage = "Missing )."
type UnclosedGroupMessage = typeof unclosedGroupMessage

export const transitionToSuffix = (s: Parser.state<Parser.left.suffixable>) => {
    if (s.l.groups.length) {
        return s.error(unclosedGroupMessage)
    }
    return Operator.mergeBranches(s) as Parser.state.suffix
}

export type TransitionToSuffix<S extends Parser.State<Parser.Left.Suffixable>> =
    S["L"]["groups"] extends []
        ? Parser.State.From<{
              L: Parser.Left.SuffixFrom<{
                  lowerBound: S["L"]["lowerBound"]
                  root: Operator.MergeBranches<
                      S["L"]["branches"],
                      S["L"]["root"]
                  >
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
        return Operator.finalizeOptional(s, ctx)
    }
    if (Parser.Tokens.inTokenSet(s.l.nextSuffix, Operator.Bound.tokens)) {
        return suffixLoop(
            Operator.Bound.parseRight(s, s.l.nextSuffix, ctx),
            ctx
        )
    }
    return s.error(`Unexpected suffix token '${s.l.nextSuffix}'.`)
}

export type SuffixLoop<S extends Parser.State.Of<Parser.Left.Suffix>> =
    S["L"]["nextSuffix"] extends "END"
        ? ExtractFinalizedRoot<S["L"]>
        : SuffixLoop<NextSuffix<S>>

export type NextSuffix<S extends Parser.State.Of<Parser.Left.Suffix>> =
    S["L"]["nextSuffix"] extends "?"
        ? Operator.ParseOptional<S>
        : S["L"]["nextSuffix"] extends Operator.Bound.Comparator
        ? Operator.Bound.ParseRight<S, S["L"]["nextSuffix"]>
        : Parser.State.Error<`Unexpected suffix token '${S["L"]["nextSuffix"]}'.`>

export type ExtractFinalizedRoot<L extends Parser.Left.Suffix> =
    L["lowerBound"] extends undefined
        ? L["root"]
        : Node.ParseError<Operator.Bound.UnpairedLeftBoundMessage>
