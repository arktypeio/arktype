import { inKeySet } from "@re-/tools"
import type { literalNode } from "../../../../nodes/terminals/literal.js"
import type { Left, left } from "../../state/left.js"
import type { Scanner } from "../../state/scanner.js"
import { scanner } from "../../state/scanner.js"
import type { parserState } from "../../state/state.js"
import type {
    DoubleBoundComparator,
    InvalidDoubleBoundMessage,
    InvertedComparators
} from "./common.js"
import {
    doubleBoundComparators,
    invalidDoubleBoundMessage,
    invertedComparators
} from "./common.js"

type NonPrefixLeftBoundMessage<
    BoundingValue extends number,
    T extends Scanner.Comparator
> = `Left bound '${BoundingValue}${T}...' must occur at the beginning of the definition.`

export const nonPrefixLeftBoundMessage = <
    BoundingValue extends number,
    Token extends Scanner.Comparator
>(
    Value: BoundingValue,
    T: Token
): NonPrefixLeftBoundMessage<BoundingValue, Token> =>
    `Left bound '${Value}${T}...' must occur at the beginning of the definition.`

const applyLeftBound = (
    s: parserState<left.withRoot<literalNode<number>>>,
    token: DoubleBoundComparator
) => {
    s.l.lowerBound = [invertedComparators[token], s.l.root.value]
    s.l.root = undefined as any
    return s
}

export const reduceLeft = (
    s: parserState<left.withRoot<literalNode<number>>>,
    token: Scanner.Comparator
) =>
    s.isPrefixable()
        ? inKeySet(token, doubleBoundComparators)
            ? applyLeftBound(s, token)
            : s.error(invalidDoubleBoundMessage(token))
        : s.error(nonPrefixLeftBoundMessage(s.l.root.value, token))

export type ReduceLeft<
    L extends Left,
    Value extends number,
    Token extends Scanner.Comparator
> = Left.IsPrefixable<L> extends true
    ? Token extends DoubleBoundComparator
        ? Left.From<{
              groups: []
              branches: {}
              root: undefined
              lowerBound: [InvertedComparators[Token], Value]
          }>
        : Left.Error<InvalidDoubleBoundMessage<Token>>
    : Left.Error<NonPrefixLeftBoundMessage<Value, Token>>
