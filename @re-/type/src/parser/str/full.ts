import type { parseContext, ParseError, parseFn, strNode } from "./common.js"
import type { ParseOperand } from "./operand/operand.js"
import { parseOperand } from "./operand/operand.js"
import type {
    ParseSuffixBound,
    UnpairedLeftBoundMessage
} from "./operator/bound/right.js"
import {
    parseSuffixBound,
    unpairedLeftBoundMessage
} from "./operator/bound/right.js"
import type { MergeBranches } from "./operator/branch/branch.js"
import { mergeBranches } from "./operator/branch/branch.js"
import type { ParseOptional } from "./operator/optional.js"
import { parseOptional } from "./operator/optional.js"
import type { ParseOperator } from "./operator/parse.js"
import { parseOperator } from "./operator/parse.js"
import type { Left, left } from "./state/left.js"
import type { Scanner } from "./state/scanner.js"
import { scanner } from "./state/scanner.js"
import type { ParserState } from "./state/state.js"
import { parserState } from "./state/state.js"

export const fullParse: parseFn<string> = (def, ctx) =>
    loop(parseOperand(new parserState(def), ctx), ctx)

export type FullParse<Def extends string, Dict> = Loop<
    ParseOperand<ParserState.New<Def>, Dict>,
    Dict
>

const loop = (s: parserState, ctx: parseContext): strNode => {
    while (!s.isSuffixable()) {
        next(s, ctx)
    }
    return suffixLoop(transitionToSuffix(s), ctx)
}

type Loop<S extends ParserState, Dict> = S["L"]["nextSuffix"] extends string
    ? // We just checked that nextSuffix is a string, so this is safe.
      // @ts-ignore There are ways to get TS to infer that, but they're more expensive.
      SuffixLoop<TransitionToSuffix<S>>
    : Loop<Next<S, Dict>, Dict>

const next = (s: parserState, ctx: parseContext): parserState =>
    s.hasRoot() ? parseOperator(s, ctx) : parseOperand(s, ctx)

type Next<S extends ParserState, Dict> = S["L"]["root"] extends undefined
    ? ParseOperand<S, Dict>
    : ParseOperator<S>

export const unclosedGroupMessage = "Missing )."
type UnclosedGroupMessage = typeof unclosedGroupMessage

const transitionToSuffix = (s: parserState<left.suffixable>) => {
    if (s.l.groups.length) {
        return s.error(unclosedGroupMessage)
    }
    return mergeBranches(s) as parserState.suffix
}

type TransitionToSuffix<S extends ParserState<Left.Suffixable>> =
    S["L"]["groups"] extends []
        ? ParserState.From<{
              L: Left.SuffixFrom<{
                  lowerBound: S["L"]["lowerBound"]
                  root: MergeBranches<S["L"]["branches"], S["L"]["root"]>
                  nextSuffix: S["L"]["nextSuffix"]
              }>
              R: S["R"]
          }>
        : ParserState.Error<UnclosedGroupMessage>

const suffixLoop = (s: parserState.suffix, ctx: parseContext): strNode => {
    if (s.l.nextSuffix === "END") {
        return finalize(s)
    }
    if (s.l.nextSuffix === "?") {
        return finalize(parseOptional(s, ctx))
    }
    if (scanner.inTokenSet(s.l.nextSuffix, scanner.comparators)) {
        return suffixLoop(parseSuffixBound(s, s.l.nextSuffix), ctx)
    }
    return s.error(unexpectedSuffixMessage(s.l.nextSuffix))
}

type SuffixLoop<S extends ParserState.Of<Left.Suffix>> =
    S["L"]["nextSuffix"] extends "END"
        ? Finalize<S["L"]>
        : SuffixLoop<NextSuffix<S>>

type NextSuffix<S extends ParserState.Of<Left.Suffix>> =
    S["L"]["nextSuffix"] extends "?"
        ? ParseOptional<S>
        : S["L"]["nextSuffix"] extends Scanner.Comparator
        ? ParseSuffixBound<S, S["L"]["nextSuffix"]>
        : ParserState.Error<UnexpectedSuffixMessage<S["L"]["nextSuffix"]>>

const finalize = (s: parserState.suffix) =>
    s.l.lowerBound ? s.error(unpairedLeftBoundMessage) : s.l.root

type Finalize<L extends Left.Suffix> = L["lowerBound"] extends undefined
    ? L["root"]
    : ParseError<UnpairedLeftBoundMessage>

type UnexpectedSuffixMessage<Token extends string> =
    `Unexpected suffix token '${Token}'.`

const unexpectedSuffixMessage = <Token extends string>(
    token: Token
): UnexpectedSuffixMessage<Token> => `Unexpected suffix token '${token}'.`
