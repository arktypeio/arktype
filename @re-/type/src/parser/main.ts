import { Node, strNode } from "./common.js"
import { ParseOperand, parseOperand } from "./operand/index.js"
import { Operator } from "./operator/index.js"
import { Parser } from "./parser/index.js"

export const parse: Nodes.parseFn<string> = (def, ctx) =>
    loop(parseOperand(new Parser.state(def), ctx), ctx)

export type Parse<Def extends string, Dict> = Loop<
    ParseOperand<Parser.State.New<Def>, Dict>,
    Dict
>

const loop = (s: Parser.state, ctx: Nodes.context): strNode => {
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

const next = (s: Parser.state, ctx: Nodes.context): Parser.state =>
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
    ctx: Nodes.context
): strNode => {
    if (s.l.nextSuffix === "END") {
        return finalize(s)
    }
    if (s.l.nextSuffix === "?") {
        return finalize(Operator.parseOptional(s, ctx))
    }
    if (Parser.inTokenSet(s.l.nextSuffix, Operator.Bound.comparators)) {
        return suffixLoop(
            Operator.Bound.parseSuffix(s, s.l.nextSuffix, ctx),
            ctx
        )
    }
    return s.error(unexpectedSuffixMessage(s.l.nextSuffix))
}

export type SuffixLoop<S extends Parser.State.Of<Parser.Left.Suffix>> =
    S["L"]["nextSuffix"] extends "END"
        ? Finalize<S["L"]>
        : SuffixLoop<NextSuffix<S>>

export type NextSuffix<S extends Parser.State.Of<Parser.Left.Suffix>> =
    S["L"]["nextSuffix"] extends "?"
        ? Operator.ParseOptional<S>
        : S["L"]["nextSuffix"] extends Operator.Bound.Comparator
        ? Operator.Bound.ParseSuffix<S, S["L"]["nextSuffix"]>
        : Parser.State.Error<UnexpectedSuffixMessage<S["L"]["nextSuffix"]>>

const finalize = (s: Parser.state.suffix) =>
    s.l.lowerBound ? s.error(Operator.Bound.unpairedLeftBoundMessage) : s.l.root

type Finalize<L extends Parser.Left.Suffix> = L["lowerBound"] extends undefined
    ? L["root"]
    : Nodes.ParseError<Operator.Bound.UnpairedLeftBoundMessage>

type UnexpectedSuffixMessage<Token extends string> =
    `Unexpected suffix token '${Token}'.`

const unexpectedSuffixMessage = <Token extends string>(
    token: Token
): UnexpectedSuffixMessage<Token> => `Unexpected suffix token '${token}'.`
