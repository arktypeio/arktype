import { isKeyOf } from "@re-/tools"
import type { NodeToString } from "../../../../nodes/common.js"
import { Bound } from "../../../../nodes/nonTerminal/binary/bound.js"
import { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import type { left, Left } from "../../state/left.js"
import type { Scanner } from "../../state/scanner.js"
import type { parserState, ParserState } from "../../state/state.js"
import { Comparators } from "./tokens.js"

// TODO: Fix
type BoundableNode = any

export namespace RightBoundOperator {
    export const parse = (
        s: parserState.requireRoot,
        comparator: Bound.Token
    ) => {
        const limitToken = s.r.shiftUntilNextTerminator()
        const limit = UnenclosedNumber.parseWellFormed(
            limitToken,
            invalidLimitMessage(comparator, limitToken + s.r.unscanned),
            "number"
        )
        return reduce(
            s,
            comparator,
            new PrimitiveLiteral.Node(limitToken, limit)
        )
    }

    export type Parse<
        S extends ParserState,
        Comparator extends Bound.Token
    > = Scanner.ShiftUntilNextTerminator<S["R"]> extends Scanner.Shifted<
        infer Scanned,
        infer NextUnscanned
    >
        ? ParserState.From<{
              L: Reduce<
                  S["L"],
                  Comparator,
                  Scanned,
                  UnenclosedNumber.ParseWellFormedNumber<
                      Scanned,
                      InvalidLimitMessage<Comparator, Scanned>
                  >
              >
              R: NextUnscanned
          }>
        : never

    const reduce = (
        s: parserState.requireRoot,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
    ) =>
        isBoundable(s)
            ? isLeftBounded(s)
                ? reduceDouble(s, comparator, limit)
                : reduceSingle(s, comparator, limit)
            : s.error(unboundableMessage(s.l.root.toString()))

    type Reduce<
        L extends Left,
        Comparator extends Bound.Token,
        LimitToken extends string,
        LimitParseResult extends string | number
    > = LimitParseResult extends number
        ? L extends { root: BoundableNode }
            ? L extends {
                  branches: {
                      leftBound: Left.OpenBranches.LeftBound<
                          infer LeftLimit,
                          infer LeftComparator
                      >
                  }
              }
                ? ReduceDouble<
                      L,
                      LeftLimit,
                      LeftComparator,
                      Comparator,
                      //TODO: Fix
                      // @ts-expect-error
                      LimitToken
                  >
                : ReduceSingle<L, Comparator, LimitParseResult>
            : Left.Error<UnboundableMessage<NodeToString<L["root"]>>>
        : Left.Error<`${LimitParseResult}`>

    const isBoundable = (
        s: parserState.requireRoot
    ): s is parserState<{ root: BoundableNode }> => true

    const isLeftBounded = (
        s: parserState
    ): s is parserState<{ branches: { leftBound: left.openLeftBound } }> =>
        !!s.l.branches.leftBound

    type ReduceDouble<
        L extends Left<{
            root: BoundableNode
        }>,
        LeftLimit extends PrimitiveLiteral.Number,
        LeftComparator extends Bound.Token,
        RightComparator extends Bound.Token,
        RightLimit extends PrimitiveLiteral.Number
    > = RightComparator extends Comparators.SingleOnly
        ? Left.Error<Comparators.InvalidDoubleMessage<RightComparator>>
        : Left.From<{
              leftBound: undefined
              root: [
                  [LeftLimit, LeftComparator, L["root"]],
                  RightComparator,
                  RightLimit
              ]
              groups: L["groups"]
              branches: L["branches"]
          }>

    const reduceDouble = (
        s: parserState<{
            root: BoundableNode
            branches: {
                leftBound: left.openLeftBound
            }
        }>,
        rightComparator: Bound.Token,
        rightLimit: PrimitiveLiteral.Node<number>
    ) => {
        if (isKeyOf(rightComparator, Comparators.singleOnly)) {
            return s.error(Comparators.invalidDoubleMessage(rightComparator))
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
        s: parserState.requireRoot<BoundableNode>,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
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
