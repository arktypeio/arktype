import { isKeyOf } from "@re-/tools"
import type { NodeToString } from "../../../../../nodes/common.js"
import {
    applyBound,
    BoundConstraint,
    isBoundable
} from "../../../../../nodes/constraints/bounds.js"
import type {
    BoundableAst,
    BoundableNode,
    Bounds
} from "../../../../../nodes/constraints/bounds.js"
import type { AddConstraints } from "../../../../../nodes/constraints/constraint.js"
import type { NumberLiteralDefinition } from "../../../../../nodes/terminals/literal.js"
import type { BaseTerminatingChar } from "../../../operand/common.js"
import {
    isNumberLiteral,
    numberLiteralToValue
} from "../../../operand/unenclosed.js"
import type { Left, left } from "../../../state/left.js"
import type { Scanner, scanner } from "../../../state/scanner.js"
import { invalidSuffixMessage } from "../../../state/scanner.js"
import type { parserState, ParserState } from "../../../state/state.js"
import type { InvalidDoubleBoundMessage } from "./common.js"
import { doubleBoundComparators, invalidDoubleBoundMessage } from "./common.js"

export const parseSuffixBound = (s: parserState, token: Scanner.Comparator) => {
    const boundingValue = s.r.shiftUntil(untilPostBoundSuffix)
    const nextSuffix = s.r.shift() as "?" | "END"
    return isNumberLiteral(boundingValue)
        ? reduceRightBound(
              s,
              [token, numberLiteralToValue(boundingValue)],
              nextSuffix
          )
        : s.error(
              invalidSuffixMessage(
                  token,
                  boundingValue + s.r.unscanned,
                  "a number literal"
              )
          )
}

export type ParseRightBound<
    S extends ParserState,
    Comparator extends Scanner.Comparator
> = Scanner.ShiftUntil<S["R"], BaseTerminatingChar> extends Scanner.Shifted<
    infer Scanned,
    infer NextUnscanned
>
    ? Scanned extends NumberLiteralDefinition<infer Value>
        ? ParserState.From<{
              L: ReduceRightBound<S["L"], [Comparator, Value]>
              R: NextUnscanned
          }>
        : ParserState.Error<InvalidLimitMessage<Comparator, Scanned>>
    : never

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
    L extends Left,
    RightBound extends Bounds.Bound
> = L extends { root: BoundableAst }
    ? L extends { lowerBound: Bounds.Lower }
        ? ReduceDouble<L, RightBound>
        : ReduceSingle<L, RightBound>
    : Left.Error<UnboundableMessage<NodeToString<L["root"]>>>

const hasBoundableRoot = (
    s: parserState<left.suffix>
): s is parserState<left.suffix<{ root: BoundableNode }>> =>
    isBoundable(s.l.root)

const hasLowerBound = (
    s: parserState.suffix
): s is parserState.suffix<{ lowerBound: Bounds.Lower }> => !!s.l.lowerBound

type ReduceDouble<
    L extends Left<{
        root: BoundableAst
        lowerBound: Bounds.Lower
    }>,
    RightBound extends Bounds.Bound
> = RightBound extends Bounds.Upper
    ? Left.From<{
          lowerBound: undefined
          root: AddConstraints<L["root"], [L["lowerBound"], RightBound]>
          groups: L["groups"]
          branches: L["branches"]
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
        applyBound(s.l.root, new BoundConstraint([s.l.lowerBound, right]))
        s.l.lowerBound = undefined as any
        s.l.nextSuffix = nextSuffix
        return s
    }
    return s.error(invalidDoubleBoundMessage(right[0]))
}

type ReduceSingle<
    L extends Left<{ root: BoundableAst }>,
    Single extends Bounds.Bound
> = Left.SetRoot<L, AddConstraints<L["root"], [Single]>>

const reduceSingle = (
    s: parserState.suffix<{ root: BoundableNode }>,
    right: Bounds.Bound,
    nextSuffix: Scanner.Suffix
) => {
    applyBound(s.l.root, new BoundConstraint([right]))
    s.l.lowerBound = undefined
    s.l.nextSuffix = nextSuffix
    return s
}

const isValidDoubleBoundRight = (right: Bounds.Bound): right is Bounds.Upper =>
    isKeyOf(right[0], doubleBoundComparators)

export const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`

export type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

type UnboundableMessage<Root extends string> =
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or an array-typed expression.`

export const unboundableMessage = <Root extends string>(
    Root: Root
): UnboundableMessage<Root> =>
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or an array-typed expression.`

export type InvalidLimitMessage<
    Comparator extends Scanner.Comparator,
    Token extends string
> = `Right bound ${Comparator} must be followed by a number literal (was '${Token}').`

export const invalidLimitMessage = <
    Comparator extends Scanner.Comparator,
    Token extends string
>(
    comparator: Comparator,
    token: Token
): InvalidLimitMessage<Comparator, Token> =>
    `Right bound ${comparator} must be followed by a number literal (was '${token}').`

const untilPostBoundSuffix: scanner.UntilCondition = (scanner) =>
    scanner.lookahead === "?"
