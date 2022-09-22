import { inKeySet } from "@re-/tools"
import type { NodeToString } from "../../../../nodes/common.js"
import type {
    BoundableAst,
    BoundableNode,
    Bounds
} from "../../../../nodes/constraints/bounds.js"
import {
    applyBound,
    BoundsConstraint,
    isBoundable
} from "../../../../nodes/constraints/bounds.js"
import type { NumberLiteralDefinition } from "../../operand/unenclosed.js"
import {
    isNumberLiteral,
    numberLiteralToValue
} from "../../operand/unenclosed.js"
import type { Left, left } from "../../state/left.js"
import type { Scanner, scanner } from "../../state/scanner.js"
import type { parserState, ParserState } from "../../state/state.js"
import type { InvalidDoubleBoundMessage } from "./common.js"
import { doubleBoundComparators, invalidDoubleBoundMessage } from "./common.js"

export const parseSuffixBound = (
    s: parserState<left.suffix>,
    token: Scanner.Comparator
) => {
    const boundingValue = s.r.shiftUntil(untilNextSuffix)
    const nextSuffix = s.r.shift() as "?" | "END"
    return isNumberLiteral(boundingValue)
        ? reduceRightBound(
              s,
              [token, numberLiteralToValue(boundingValue)],
              nextSuffix
          )
        : s.error(nonSuffixRightBoundMessage(token, boundingValue))
}

export type ParseSuffixBound<
    S extends ParserState.Of<Left.Suffix>,
    Token extends Scanner.Comparator
> = S["R"] extends BoundingValueWithSuffix<
    infer Value,
    infer NextSuffix,
    infer Unscanned
>
    ? ParserState.From<{
          L: ReduceRightBound<S["L"], [Token, Value], NextSuffix>
          R: Unscanned
      }>
    : S["R"] extends NumberLiteralDefinition<infer Value>
    ? ParserState.From<{
          L: ReduceRightBound<S["L"], [Token, Value], "END">
          R: ""
      }>
    : ParserState.Error<NonSuffixRightBoundMessage<Token, S["R"]>>

type BoundingValueWithSuffix<
    BoundingValue extends number,
    NextSuffix extends "?",
    Unscanned extends string
> = `${BoundingValue}${NextSuffix}${Unscanned}`

export const reduceRightBound = (
    s: parserState<left.suffix>,
    right: Bounds.Bound,
    nextSuffix: Scanner.Suffix
) =>
    hasBoundableRoot(s)
        ? hasLowerBound(s)
            ? reduceDouble(s, right, nextSuffix)
            : reduceSingle(s, right, nextSuffix)
        : s.error(unboundableMessage(s.l.root.toString()))

export type ReduceRightBound<
    L extends Left.Suffix,
    RightBound extends Bounds.Bound,
    NextSuffix extends Scanner.Suffix
> = L extends { root: BoundableAst }
    ? L extends { lowerBound: Bounds.Lower }
        ? ReduceDouble<L, RightBound, NextSuffix>
        : ReduceSingle<L, RightBound, NextSuffix>
    : Left.Error<UnboundableMessage<NodeToString<L["root"]>>>

const hasBoundableRoot = (
    s: parserState<left.suffix>
): s is parserState<left.suffix<{ root: BoundableNode }>> =>
    isBoundable(s.l.root)

const hasLowerBound = (
    s: parserState.suffix
): s is parserState.suffix<{ lowerBound: Bounds.Lower }> => !!s.l.lowerBound

type ReduceDouble<
    L extends Left.Suffix<{
        root: BoundableAst
        lowerBound: Bounds.Lower
    }>,
    RightBound extends Bounds.Bound,
    NextSuffix extends Scanner.Suffix
> = RightBound extends Bounds.Upper
    ? Left.SuffixFrom<{
          lowerBound: undefined
          root: Bounds.Apply<L["root"], [L["lowerBound"], RightBound]>
          nextSuffix: NextSuffix
      }>
    : Left.Error<InvalidDoubleBoundMessage<RightBound[0]>>

const reduceDouble = (
    s: parserState<
        left.suffix<{
            root: BoundableNode
            lowerBound: Bounds.Lower
        }>
    >,
    right: Bounds.Bound,
    nextSuffix: Scanner.Suffix
) => {
    if (isValidDoubleBoundRight(right)) {
        applyBound(s.l.root, new BoundsConstraint([s.l.lowerBound, right]))
        s.l.lowerBound = undefined as any
        s.l.nextSuffix = nextSuffix
        return s
    }
    return s.error(invalidDoubleBoundMessage(right[0]))
}

type ReduceSingle<
    L extends Left.Suffix,
    Single extends Bounds.Bound,
    NextSuffix extends Scanner.Suffix
> = Left.SuffixFrom<{
    lowerBound: undefined
    root: Bounds.Apply<L["root"], [Single]>
    nextSuffix: NextSuffix
}>

const reduceSingle = (
    s: parserState.suffix<{ root: BoundableNode }>,
    right: Bounds.Bound,
    nextSuffix: Scanner.Suffix
) => {
    applyBound(s.l.root, new BoundsConstraint([right]))
    s.l.lowerBound = undefined
    s.l.nextSuffix = nextSuffix
    return s
}

const isValidDoubleBoundRight = (right: Bounds.Bound): right is Bounds.Upper =>
    inKeySet(right[0], doubleBoundComparators)

export const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`

export type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

type UnboundableMessage<Root extends string> =
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`

export const unboundableMessage = <Root extends string>(
    Root: Root
): UnboundableMessage<Root> =>
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`

export type NonSuffixRightBoundMessage<
    T extends Scanner.Comparator,
    Suffix extends string
> = `Right bound ${T} must be followed by a number literal and zero or more additional suffix tokens (was '${Suffix}').`

export const nonSuffixRightBoundMessage = <
    Token extends Scanner.Comparator,
    Suffix extends string
>(
    t: Token,
    suffix: Suffix
): NonSuffixRightBoundMessage<Token, Suffix> =>
    `Right bound ${t} must be followed by a number literal and zero or more additional suffix tokens (was '${suffix}').`

const untilNextSuffix: scanner.UntilCondition = (scanner) =>
    scanner.lookahead === "?"
