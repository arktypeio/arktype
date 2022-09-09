import { numberLiteralNode } from "../../../nodes/types/terminal/literals/number.js"
import { Left, left } from "../../parser/left.js"
import { scanner } from "../../parser/scanner.js"
import { parserState } from "../../parser/state.js"
import {
    Comparator,
    DoubleBoundComparator,
    doubleBoundComparators,
    InvalidDoubleBoundMessage,
    invalidDoubleBoundMessage,
    InvertedComparators,
    invertedComparators
} from "./common.js"

type NonPrefixLeftBoundMessage<
    BoundingValue extends number,
    T extends Comparator
> = `Left bound '${BoundingValue}${T}...' must occur at the beginning of the definition.`

export const nonPrefixLeftBoundMessage = <
    BoundingValue extends number,
    Token extends Comparator
>(
    Value: BoundingValue,
    T: Token
): NonPrefixLeftBoundMessage<BoundingValue, Token> =>
    `Left bound '${Value}${T}...' must occur at the beginning of the definition.`

const applyLeftBound = (
    s: parserState<left.withRoot<numberLiteralNode>>,
    token: DoubleBoundComparator
) => {
    s.l.lowerBound = [invertedComparators[token], s.l.root.value]
    s.l.root = undefined as any
    return s
}

export const reduceLeft = (
    s: parserState<left.withRoot<numberLiteralNode>>,
    token: Comparator
) =>
    s.isPrefixable()
        ? scanner.inTokenSet(token, doubleBoundComparators)
            ? applyLeftBound(s, token)
            : s.error(invalidDoubleBoundMessage(token))
        : s.error(nonPrefixLeftBoundMessage(s.l.root.value, token))

export type ReduceLeft<
    L extends Left,
    Value extends number,
    Token extends Comparator
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
