import { numberLiteralNode } from "../../operand/unenclosed/numberLiteral.js"
import {
    Comparator,
    DoubleBoundComparator,
    doubleBoundComparators,
    InvalidDoubleBoundMessage,
    invalidDoubleBoundMessage,
    InvertedComparators,
    invertedComparators,
    Parser
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
    s: Parser.state<Parser.left.withRoot<numberLiteralNode>>,
    token: DoubleBoundComparator
) => {
    s.l.lowerBound = [invertedComparators[token], s.l.root.value]
    s.l.root = undefined as any
    return s
}

export const reduceLeft = (
    s: Parser.state<Parser.left.withRoot<numberLiteralNode>>,
    token: Comparator
) =>
    s.isPrefixable()
        ? Parser.inTokenSet(token, doubleBoundComparators)
            ? applyLeftBound(s, token)
            : s.error(invalidDoubleBoundMessage(token))
        : s.error(nonPrefixLeftBoundMessage(s.l.root.value, token))

export type ReduceLeft<
    L extends Parser.Left,
    Value extends number,
    Token extends Comparator
> = Parser.Left.IsPrefixable<L> extends true
    ? Token extends DoubleBoundComparator
        ? Parser.Left.From<{
              groups: []
              branches: {}
              root: undefined
              lowerBound: [InvertedComparators[Token], Value]
          }>
        : Parser.Left.Error<InvalidDoubleBoundMessage<Token>>
    : Parser.Left.Error<NonPrefixLeftBoundMessage<Value, Token>>
