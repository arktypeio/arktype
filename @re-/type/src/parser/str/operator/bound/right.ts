import { isKeyOf } from "@re-/tools"
import { Bound } from "../../../../nodes/nonTerminal/binary/bound.js"
import type { NumberLiteralDefinition } from "../../../../nodes/terminal/literal.js"
import { LiteralNode } from "../../../../nodes/terminal/literal.js"
import {
    isNumberLiteral,
    numberLiteralToValue
} from "../../operand/unenclosed.js"
import type { left, Left } from "../../state/left.js"
import type { Scanner } from "../../state/scanner.js"
import type { parserState, ParserState } from "../../state/state.js"
import { ComparatorTokens } from "./tokens.js"

export namespace RightBoundOperator {
    export const parse = (
        s: parserState.withPreconditionRoot,
        comparator: Bound.Token
    ) => {
        const boundingValue = s.r.shiftUntilNextTerminator()
        if (isNumberLiteral(boundingValue)) {
            s.l.root = new LiteralNode(boundingValue)
        }
        return isNumberLiteral(boundingValue)
            ? reduce(s, comparator, numberLiteralToValue(boundingValue))
            : s.error(
                  invalidLimitMessage(comparator, boundingValue + s.r.unscanned)
              )
    }

    export type Parse<
        S extends ParserState,
        Comparator extends Bound.Token
    > = Scanner.ShiftUntilNextTerminator<S["R"]> extends Scanner.Shifted<
        infer Scanned,
        infer NextUnscanned
    >
        ? Scanned extends NumberLiteralDefinition<infer Limit>
            ? ParserState.From<{
                  L: Reduce<S["L"], Comparator, Limit>
                  R: NextUnscanned
              }>
            : ParserState.Error<InvalidLimitMessage<Comparator, Scanned>>
        : never

    const reduce = (
        s: parserState.withPreconditionRoot,
        comparator: Bound.Token,
        limit: LiteralNode<number>
    ) =>
        isBoundable(s)
            ? isLeftBounded(s)
                ? reduceDouble(s, comparator, limit)
                : reduceSingle(s, comparator, limit)
            : s.error(unboundableMessage(s.l.root.typeStr()))

    type Reduce<
        L extends Left,
        Comparator extends Bound.Token,
        Limit extends number
    > = L extends { root: BoundableNode }
        ? L extends {
              branches: {
                  leftBound: Left.OpenLeftBound<
                      infer LeftLimit,
                      infer LeftComparator
                  >
              }
          }
            ? ReduceDouble<L, LeftLimit, LeftComparator, Comparator, Limit>
            : ReduceSingle<L, Comparator, Limit>
        : Left.Error<UnboundableMessage<NodeToString<L["root"]>>>

    const isBoundable = (
        s: parserState.withPreconditionRoot
    ): s is parserState<{ root: BoundableNode }> => isBoundable(s.l.root)

    const isLeftBounded = (
        s: parserState
    ): s is parserState<{ branches: { leftBound: left.openLeftBound } }> =>
        !!s.l.branches.leftBound

    type ReduceDouble<
        L extends Left<{
            root: BoundableNode
        }>,
        LeftLimit extends number,
        LeftComparator extends Bound.Token,
        RightComparator extends Bound.Token,
        RightLimit extends number
    > = RightComparator extends ComparatorTokens.SingleOnly
        ? Left.From<{
              leftBound: undefined
              root: [
                  [LeftLimit, LeftComparator, L["root"]],
                  RightComparator,
                  RightLimit
              ]
              groups: L["groups"]
              branches: L["branches"]
          }>
        : Left.Error<ComparatorTokens.InvalidDoubleMessage<RightComparator>>

    const reduceDouble = (
        s: parserState<{
            root: BoundableNode
            branches: {
                leftBound: {}
            }
        }>,
        rightComparator: Bound.Token,
        rightLimit: LiteralNode<number>
    ) => {
        if (isKeyOf(rightComparator, ComparatorTokens.singleOnly)) {
            return s.error(
                ComparatorTokens.invalidDoubleMessage(rightComparator)
            )
        }
        s.l.root = new Bound.Node(
            [s.l.branches.leftBound[0], s.l.root],
            s.l.branches.leftBound[1],
            true
        )
        s.l.root = new Bound.Node(
            [s.l.root, rightLimit],
            rightComparator,
            false
        )
    }

    type ReduceSingle<
        L extends Left<{ root: BoundableNode }>,
        Comparator extends Bound.Token,
        Limit extends number
    > = Left.SetRoot<L, [L["root"], Comparator, Limit]>

    const reduceSingle = (
        s: parserState.withPreconditionRoot<BoundableNode>,
        limit: LiteralNode<number>,
        comparator: Bound.Token
    ) => {
        s.l.root = new Bound.Node([s.l.root, limit], comparator, false)
        s.l.branches.leftBound = undefined
        return s
    }

    type UnboundableMessage<Root extends string> =
        `Bounded expression '${Root}' must be a number-or-string-typed keyword or an array-typed expression.`

    export const unboundableMessage = <Root extends string>(
        Root: Root
    ): UnboundableMessage<Root> =>
        `Bounded expression '${Root}' must be a number-or-string-typed keyword or an array-typed expression.`

    export type InvalidLimitMessage<
        Comparator extends Bound.Token,
        Limit extends string
    > = `Right comparator ${Comparator} must be followed by a number literal (was '${Limit}').`

    export const invalidLimitMessage = <
        Comparator extends Bound.Token,
        Limit extends string
    >(
        comparator: Comparator,
        limit: Limit
    ): InvalidLimitMessage<Comparator, Limit> =>
        `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`
}
