import { isKeyOf } from "@re-/tools"
import type { LiteralNode } from "../../../../../nodes/terminal/literal.js"
import type { Left } from "../../../state/left.js"
import type { parserState } from "../../../state/state.js"
import type {
    Comparator,
    DoubleBoundComparator,
    InvalidDoubleBoundMessage,
    InvertedComparators,
    NormalizedLowerBoundComparator
} from "./common.js"
import {
    doubleBoundComparators,
    invalidDoubleBoundMessage,
    invertedComparators
} from "./common.js"

const applyLeftBound = (
    s: parserState.withRoot<LiteralNode<number>>,
    token: DoubleBoundComparator
) => {
    s.l.lowerBound = [invertedComparators[token], s.l.root.value]
    s.l.root = undefined as any
    return s
}

export const reduceLeft = (
    s: parserState.withRoot<LiteralNode<number>>,
    token: Comparator
) =>
    isKeyOf(token, doubleBoundComparators)
        ? applyLeftBound(s, token)
        : s.error(invalidDoubleBoundMessage(token))

export type ReduceLeft<
    L extends Left,
    Value extends number,
    Token extends Comparator
> = Token extends DoubleBoundComparator
    ? Left.From<{
          groups: L["groups"]
          branches: L["branches"]
          root: undefined
          lowerBound: [InvertedComparators[Token], Value]
      }>
    : Left.Error<InvalidDoubleBoundMessage<Token>>

// Finalization is responsible for checking that there are no unpaired left bounds,
// so we just export the error messages for use here

export type UnpairedLeftBoundMessage<
    Root extends string,
    Token extends NormalizedLowerBoundComparator,
    Limit extends number
> = `Left bounds are only valid when paired with right bounds. Consider using ${Root}${Token}${Limit} instead.`

export const unpairedLeftBoundMessage = <
    Root extends string,
    Token extends NormalizedLowerBoundComparator,
    Limit extends number
>(
    root: Root,
    normalizedComparator: Token,
    limit: Limit
): UnpairedLeftBoundMessage<Root, Token, Limit> =>
    `Left bounds are only valid when paired with right bounds. Consider using ${root}${normalizedComparator}${limit} instead.`
