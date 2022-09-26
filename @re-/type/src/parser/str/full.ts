import { isKeyOf } from "@re-/tools"
import type { Base } from "../../nodes/base.js"
import type {
    ParseError,
    parseFn,
    parserContext,
    ParserContext
} from "../common.js"
import type { ParseOperand } from "./operand/operand.js"
import { parseOperand } from "./operand/operand.js"
import type { MergeBranches } from "./operator/binary/branch.js"
import { mergeBranches } from "./operator/binary/branch.js"
import type { ParseOperator } from "./operator/parse.js"
import { parseOperator } from "./operator/parse.js"
import {
    parseSuffixBound,
    unpairedLeftBoundMessage
} from "./operator/unary/bound/right.js"
import type {
    ParseSuffixBound,
    UnpairedLeftBoundMessage
} from "./operator/unary/bound/right.js"
import type { ParseModulo } from "./operator/unary/modulo.js"
import { parseModulo } from "./operator/unary/modulo.js"
import type { ParseOptional } from "./operator/unary/optional.js"
import { parseOptional } from "./operator/unary/optional.js"
import type { Left, left } from "./state/left.js"
import type { Scanner } from "./state/scanner.js"
import { scanner } from "./state/scanner.js"
import type { ParserState } from "./state/state.js"
import { parserState } from "./state/state.js"

export const fullParse: parseFn<string> = (def, ctx) =>
    loop(parseOperand(new parserState(def), ctx), ctx)

export type FullParse<Def extends string, Ctx extends ParserContext> = Loop<
    ParseOperand<ParserState.New<Def>, Ctx>,
    Ctx
>

const loop = (s: parserState, ctx: parserContext): Base.node => {
    while (!s.isSuffixable()) {
        next(s, ctx)
    }
    return suffixLoop(transitionToSuffix(s), ctx)
}

type Loop<
    S extends ParserState,
    Ctx extends ParserContext
> = S["L"]["nextSuffix"] extends string
    ? // We just checked that nextSuffix is a string, so this is safe.
      // @ts-expect-error There are ways to get TS to infer that, but they're more expensive.
      SuffixLoop<TransitionToSuffix<S>>
    : Loop<Next<S, Ctx>, Ctx>

const next = (s: parserState, ctx: parserContext): parserState =>
    s.hasRoot() ? parseOperator(s, ctx) : parseOperand(s, ctx)

type Next<
    S extends ParserState,
    Ctx extends ParserContext
> = S["L"]["root"] extends undefined ? ParseOperand<S, Ctx> : ParseOperator<S>

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

const suffixLoop = (s: parserState.suffix, ctx: parserContext): Base.node => {
    if (s.l.nextSuffix === "END") {
        return finalize(s)
    }
    if (s.l.nextSuffix === "?") {
        return finalize(parseOptional(s, ctx))
    }
    if (isKeyOf(s.l.nextSuffix, scanner.comparators)) {
        return suffixLoop(parseSuffixBound(s, s.l.nextSuffix), ctx)
    }
    if (s.l.nextSuffix === "%") {
        return suffixLoop(parseModulo(s), ctx)
    }
    return s.error(unexpectedSuffixMessage(s.l.nextSuffix))
}

// TODO: Test removing suffixes
type SuffixLoop<S extends ParserState.Of<Left.Suffix>> =
    S["L"]["nextSuffix"] extends "END"
        ? Finalize<S["L"]>
        : SuffixLoop<NextSuffix<S>>

type NextSuffix<S extends ParserState.Of<Left.Suffix>> =
    S["L"]["nextSuffix"] extends "?"
        ? ParseOptional<S>
        : S["L"]["nextSuffix"] extends Scanner.Comparator
        ? ParseSuffixBound<S, S["L"]["nextSuffix"]>
        : S["L"]["nextSuffix"] extends "%"
        ? ParseModulo<S>
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
