import { isKeyOf } from "@re-/tools"
import type { LiteralNode } from "../../../../nodes/terminal/literal.js"
import type { parserState } from "../../state/state.js"
import type {
    DoubleBoundComparator,
    InvalidDoubleBoundMessage
} from "./common.js"
import { doubleBoundComparators, invalidDoubleBoundMessage } from "./common.js"

const applyLeftBound = (
    s: parserState.withRoot<LiteralNode<number>>,
    token: DoubleBoundComparator
) => {
    s.l.branches.leftBound = [s.l.root, token]
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
    Limit extends number,
    Token extends Bound.Token
> = `Left bounds are only valid when paired with right bounds. Consider using ${Root}${Bound.InvertedComparators[Token]}${Limit} instead.`

export const unpairedLeftBoundMessage = <
    Root extends string,
    Limit extends number,
    Token extends Bound.Token
>(
    root: Root,
    limit: Limit,
    comparator: Token
): UnpairedLeftBoundMessage<Root, Limit, Token> =>
    `Left bounds are only valid when paired with right bounds. Consider using ${root}${Bound.invertedComparators[comparator]}${limit} instead.`
