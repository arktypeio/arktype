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
    BoundsAst
} from "../../../../../nodes/constraints/bounds.js"
import type { AddConstraints } from "../../../../../nodes/constraints/constraint.js"
import type { NumberLiteralDefinition } from "../../../../../nodes/terminals/literal.js"
import {
    isNumberLiteral,
    numberLiteralToValue
} from "../../../operand/unenclosed.js"
import type { Left } from "../../../state/left.js"
import type { Scanner } from "../../../state/scanner.js"
import type { parserState, ParserState } from "../../../state/state.js"
import type { Comparator, InvalidDoubleBoundMessage } from "./common.js"
import { doubleBoundComparators, invalidDoubleBoundMessage } from "./common.js"

export const parseRightBound = (s: parserState.withRoot, token: Comparator) => {
    const boundingValue = s.r.shiftUntilNextTerminator()
    return isNumberLiteral(boundingValue)
        ? reduceRightBound(s, [token, numberLiteralToValue(boundingValue)])
        : s.error(invalidLimitMessage(token, boundingValue + s.r.unscanned))
}

export type ParseRightBound<
    S extends ParserState,
    Token extends Comparator
> = Scanner.ShiftUntil<
    S["R"],
    Scanner.UnenclosedTerminatingChar
> extends Scanner.Shifted<infer Scanned, infer NextUnscanned>
    ? Scanned extends NumberLiteralDefinition<infer Value>
        ? ParserState.From<{
              L: ReduceRightBound<S["L"], [Token, Value]>
              R: NextUnscanned
          }>
        : ParserState.Error<InvalidLimitMessage<Token, Scanned>>
    : never

export const reduceRightBound = (
    s: parserState.withRoot,
    right: BoundsAst.Single
) =>
    hasBoundableRoot(s)
        ? hasLowerBound(s)
            ? reduceDouble(s, right)
            : reduceSingle(s, right)
        : s.error(unboundableMessage(s.l.root.toString()))

export type ReduceRightBound<
    L extends Left,
    RightBound extends BoundsAst.Single
> = L extends { root: BoundableAst }
    ? L extends { lowerBound: BoundsAst.Lower }
        ? ReduceDouble<L, RightBound>
        : ReduceSingle<L, RightBound>
    : Left.Error<UnboundableMessage<NodeToString<L["root"]>>>

const hasBoundableRoot = (
    s: parserState.withRoot
): s is parserState<{ root: BoundableNode }> => isBoundable(s.l.root)

const hasLowerBound = (
    s: parserState
): s is parserState<{ lowerBound: BoundsAst.Lower }> => !!s.l.lowerBound

type ReduceDouble<
    L extends Left<{
        root: BoundableAst
        lowerBound: BoundsAst.Lower
    }>,
    RightBound extends BoundsAst.Single
> = RightBound extends BoundsAst.Upper
    ? Left.From<{
          lowerBound: undefined
          root: AddConstraints<L["root"], [L["lowerBound"], RightBound]>
          groups: L["groups"]
          branches: L["branches"]
      }>
    : Left.Error<InvalidDoubleBoundMessage<RightBound[0]>>

const reduceDouble = (
    s: parserState<{
        root: BoundableNode
        lowerBound: BoundsAst.Lower
    }>,
    right: BoundsAst.Single
) => {
    if (isValidDoubleBoundRight(right)) {
        applyBound(s.l.root, new BoundConstraint([s.l.lowerBound, right]))
        s.l.lowerBound = undefined as any
        return s
    }
    return s.error(invalidDoubleBoundMessage(right[0]))
}

type ReduceSingle<
    L extends Left<{ root: BoundableAst }>,
    Single extends BoundsAst.Single
> = Left.SetRoot<L, AddConstraints<L["root"], [Single]>>

const reduceSingle = (
    s: parserState.withRoot<BoundableNode>,
    right: BoundsAst.Single
) => {
    applyBound(s.l.root, new BoundConstraint([right]))
    s.l.lowerBound = undefined
    return s
}

const isValidDoubleBoundRight = (
    right: BoundsAst.Single
): right is BoundsAst.Upper => isKeyOf(right[0], doubleBoundComparators)

type UnboundableMessage<Root extends string> =
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or an array-typed expression.`

export const unboundableMessage = <Root extends string>(
    Root: Root
): UnboundableMessage<Root> =>
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or an array-typed expression.`

export type InvalidLimitMessage<
    Token extends Comparator,
    Limit extends string
> = `Right comparator ${Token} must be followed by a number literal (was '${Limit}').`

export const invalidLimitMessage = <
    Token extends Comparator,
    Limit extends string
>(
    token: Token,
    limit: Limit
): InvalidLimitMessage<Token, Limit> =>
    `Right comparator ${token} must be followed by a number literal (was '${limit}').`
