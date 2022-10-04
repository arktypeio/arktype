import { isKeyOf } from "@re-/tools"
import type { Base } from "../../../../nodes/common.js"
import { Bound } from "../../../../nodes/expression/bound.js"
import { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import type { Ast } from "../../../../nodes/traverse/ast.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import type { Left, left } from "../../state/left.js"
import type { Scanner } from "../../state/scanner.js"
import type { ParserState } from "../../state/state.js"
import { parserState } from "../../state/state.js"
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
            new PrimitiveLiteral.Node(
                limitToken as PrimitiveLiteral.Number,
                limit
            )
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
        isLeftBounded(s)
            ? reduceDouble(
                  parserState.mergeIntersectionAndUnionToRoot(s),
                  ...s.l.branches.leftBound,
                  comparator,
                  limit
              )
            : reduceSingle(s, comparator, limit)

    type Reduce<
        L extends Left,
        Comparator extends Bound.Token,
        LimitToken extends string,
        LimitParseResult extends string | number
    > = LimitParseResult extends number
        ? L extends {
              branches: {
                  leftBound: Left.OpenBranches.LeftBound<
                      infer LeftLimit,
                      infer LeftComparator
                  >
              }
          }
            ? ReduceDouble<
                  Left.From<{
                      groups: L["groups"]
                      branches: Left.OpenBranches.Default
                      root: Left.MergeIntersectionAndUnionToRoot<L>
                  }>,
                  LeftLimit,
                  LeftComparator,
                  Comparator,
                  Extract<LimitToken, PrimitiveLiteral.Number>
              >
            : ReduceSingle<L, Comparator, LimitParseResult>
        : Left.Error<`${LimitParseResult}`>

    const isBoundable = (
        s: parserState.requireRoot
    ): s is parserState<{ root: BoundableNode }> => true

    const isLeftBounded = (
        s: parserState
    ): s is parserState<{ branches: { leftBound: left.openLeftBound } }> =>
        !!s.l.branches.leftBound

    type ReduceDouble<
        L extends Left,
        LeftLimit extends PrimitiveLiteral.Number,
        LeftComparator extends Bound.Token,
        RightComparator extends Bound.Token,
        RightLimit extends PrimitiveLiteral.Number
    > = L["root"] extends BoundableNode
        ? RightComparator extends Bound.DoubleToken
            ? Left.SetRoot<
                  L,
                  [
                      LeftLimit,
                      LeftComparator,
                      [L["root"], RightComparator, RightLimit]
                  ]
              >
            : Left.Error<Comparators.InvalidDoubleMessage<RightComparator>>
        : Left.Error<UnboundableMessage<Ast.ToString<L["root"]>>>

    const reduceDouble = (
        s: parserState<{
            root: Base.Node
        }>,
        leftLimit: PrimitiveLiteral.Node<number>,
        leftComparator: Bound.DoubleToken,
        rightComparator: Bound.Token,
        rightLimit: PrimitiveLiteral.Node<number>
    ) => {
        if (!isBoundable(s)) {
            return s.error(unboundableMessage(s.l.root.toString()))
        }
        if (!isKeyOf(rightComparator, Bound.doubleTokens)) {
            return s.error(Comparators.invalidDoubleMessage(rightComparator))
        }
        s.l.branches.leftBound = undefined
        s.l.root = new Bound.LeftNode(
            leftLimit,
            leftComparator,
            new Bound.RightNode(s.l.root, rightComparator, rightLimit)
        )
    }

    type ReduceSingle<
        L extends Left<{ root: BoundableNode }>,
        Comparator extends Bound.Token,
        Limit extends number
    > = L["root"] extends BoundableNode
        ? Left.SetRoot<L, [L["root"], Comparator, Limit]>
        : Left.Error<UnboundableMessage<Ast.ToString<L["root"]>>>

    const reduceSingle = (
        s: parserState.requireRoot<BoundableNode>,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
    ) => {
        if (!isBoundable(s)) {
            return s.error(unboundableMessage(s.l.root.toString()))
        }
        s.l.root = new Bound.RightNode(s.l.root, comparator, limit)
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
