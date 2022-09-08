import {
    literalToNumber,
    NumberLiteralDefinition,
    numberLiteralNode
} from "../../../nodes/types/terminal/literals/number.js"
import { SuffixToken } from "../../parser/common.js"
import { Left, left } from "../../parser/left.js"
import { scanner } from "../../parser/scanner.js"
import { parserState, ParserState } from "../../parser/state.js"
import {
    Comparator,
    doubleBoundComparators,
    invalidDoubleBoundMessage,
    InvalidDoubleBoundMessage
} from "./common.js"

export const parseSuffix = (s: parserState<left.suffix>, token: Comparator) => {
    const boundingValue = s.r.shiftUntil(untilNextSuffix)
    const nextSuffix = s.r.shift() as "?" | "END"
    return numberLiteralNode.matches(boundingValue)
        ? reduceRight(s, [token, literalToNumber(boundingValue)], nextSuffix)
        : s.error(nonSuffixRightBoundMessage(token, boundingValue))
}

export type ParseSuffix<
    S extends ParserState.Of<Left.Suffix>,
    Token extends Comparator
> = S["R"] extends BoundingValueWithSuffix<
    infer Value,
    infer NextSuffix,
    infer Unscanned
>
    ? ParserState.From<{
          L: ReduceRight<S["L"], [Token, Value], NextSuffix>
          R: Unscanned
      }>
    : S["R"] extends NumberLiteralDefinition<infer Value>
    ? ParserState.From<{
          L: ReduceRight<S["L"], [Token, Value], "END">
          R: ""
      }>
    : ParserState.Error<NonSuffixRightBoundMessage<Token, S["R"]>>

type BoundingValueWithSuffix<
    BoundingValue extends number,
    NextSuffix extends "?",
    Unscanned extends string
> = `${BoundingValue}${NextSuffix}${Unscanned}`

export const reduceRight = (
    s: parserState<left.suffix>,
    right: BoundDefinition,
    nextSuffix: SuffixToken
) =>
    hasBoundableRoot(s)
        ? hasLowerBound(s)
            ? reduceDouble(s, right, nextSuffix)
            : reduceSingle(s, right, nextSuffix)
        : s.error(unboundableMessage(s.l.root.toString()))

export type ReduceRight<
    L extends Left.Suffix,
    RightBound extends BoundDefinition,
    NextSuffix extends Parser.SuffixToken
> = L extends { root: BoundableNode }
    ? L extends { lowerBound: LowerBoundDefinition }
        ? ReduceDouble<L, RightBound, NextSuffix>
        : ReduceSingle<L, RightBound, NextSuffix>
    : Left.Error<UnboundableMessage<NodeToString<L["root"]>>>

const hasBoundableRoot = (
    s: parserState<left.suffix>
): s is parserState<left.suffix<{ root: boundableNode }>> =>
    isBoundable(s.l.root)

const hasLowerBound = (
    s: parserState.suffix
): s is parserState.suffix<{ lowerBound: LowerBoundDefinition }> =>
    !!s.l.lowerBound

type ReduceDouble<
    L extends Left.Suffix<{
        root: BoundableNode
        lowerBound: LowerBoundDefinition
    }>,
    RightBound extends BoundDefinition,
    NextSuffix extends SuffixToken
> = RightBound extends UpperBoundDefinition
    ? Left.SuffixFrom<{
          lowerBound: undefined
          root: Bound<L["root"], [L["lowerBound"], RightBound]>
          nextSuffix: NextSuffix
      }>
    : Left.Error<InvalidDoubleBoundMessage<RightBound[0]>>

const reduceDouble = (
    s: parserState<
        left.suffix<{
            root: boundableNode
            lowerBound: LowerBoundDefinition
        }>
    >,
    right: BoundDefinition,
    nextSuffix: SuffixToken
) => {
    if (isValidDoubleBoundRight(right)) {
        s.l.root.bounds = new boundsConstraint([s.l.lowerBound, right])
        s.l.lowerBound = undefined as any
        s.l.nextSuffix = nextSuffix
        return s
    }
    return s.error(invalidDoubleBoundMessage(right[0]))
}

type ReduceSingle<
    L extends Left.Suffix,
    Single extends BoundDefinition,
    NextSuffix extends SuffixToken
> = Left.SuffixFrom<{
    lowerBound: undefined
    root: Bound<L["root"], [Single]>
    nextSuffix: NextSuffix
}>

const reduceSingle = (
    s: parserState.suffix<{ root: boundableNode }>,
    right: BoundDefinition,
    nextSuffix: SuffixToken
) => {
    s.l.root.bounds = new boundsConstraint([right])
    s.l.lowerBound = undefined
    s.l.nextSuffix = nextSuffix
    return s
}

const isValidDoubleBoundRight = (
    right: BoundDefinition
): right is UpperBoundDefinition =>
    Parser.inTokenSet(right[0], doubleBoundComparators)

export const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`

export type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

type UnboundableMessage<Root extends string> =
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`

export const unboundableMessage = <Root extends string>(
    Root: Root
): UnboundableMessage<Root> =>
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`

export type NonSuffixRightBoundMessage<
    T extends Comparator,
    Suffix extends string
> = `Right bound ${T} must be followed by a number literal and zero or more additional suffix tokens (got '${Suffix}').`

export const nonSuffixRightBoundMessage = <
    Token extends Comparator,
    Suffix extends string
>(
    t: Token,
    suffix: Suffix
): NonSuffixRightBoundMessage<Token, Suffix> =>
    `Right bound ${t} must be followed by a number literal and zero or more additional suffix tokens (got '${suffix}').`

const untilNextSuffix: scanner.UntilCondition = (scanner) =>
    scanner.lookahead === "?"
