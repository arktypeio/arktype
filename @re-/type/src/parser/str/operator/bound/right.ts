import { isKeyOf } from "@re-/tools"
import type { Base } from "../../../../nodes/common.js"
import { Bound } from "../../../../nodes/expression/bound.js"
import { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import type { Ast } from "../../../../nodes/traverse/ast.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import type { Scanner } from "../../state/scanner.js"
import { parserState } from "../../state/state.js"
import type { ParserState } from "../../state/state.js"
import { Comparators } from "./tokens.js"

// TODO: Fix
type BoundableNode = any

export namespace rightBoundOperator {
    export const parse = (s: parserState.WithRoot, comparator: Bound.Token) => {
        const limitToken = s.scanner.shiftUntilNextTerminator()
        const limit = UnenclosedNumber.parseWellFormed(
            limitToken,
            buildInvalidLimitMessage(
                comparator,
                limitToken + s.scanner.unscanned
            ),
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
}

export namespace RightBoundOperator {
    export type Parse<
        s extends ParserState,
        Comparator extends Bound.Token
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer Scanned, infer NextUnscanned>
        ? Reduce<
              s,
              Comparator,
              Scanned,
              UnenclosedNumber.ParseWellFormedNumber<
                  Scanned,
                  buildInvalidLimitMessage<Comparator, Scanned>
              >
          >
        : never
}

export namespace rightBoundOperator {
    export const reduce = (
        s: parserState.WithRoot,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
    ) =>
        isLeftBounded(s)
            ? reduceDouble(
                  parserState.mergeIntersectionAndUnionToRoot(s),
                  comparator,
                  limit
              )
            : reduceSingle(s, comparator, limit)
}

export namespace RightBoundOperator {
    export type Reduce<
        S extends ParserState.WithRoot,
        Comparator extends Bound.Token,
        LimitToken extends string,
        LimitParseResult extends string | number
    > = LimitParseResult extends string
        ? ParserState.error<LimitParseResult>
        : S["branches"]["leftBound"] extends {}
        ? ReduceDouble<
              ParserState.from<{
                  root: ParserState.mergeIntersectionAndUnion<S>
                  branches: {
                      leftBound: S["branches"]["leftBound"]
                      union: null
                      intersection: null
                  }
                  groups: S["groups"]
                  unscanned: S["unscanned"]
              }>,
              Comparator,
              Extract<LimitToken, PrimitiveLiteral.Number>
          >
        : ReduceSingle<S, Comparator, LimitParseResult>
}

export namespace rightBoundOperator {
    export const reduceDouble = (
        s: parserState<{
            root: Base.Node
            branches: {
                leftBound: parserState.OpenLeftBound
            }
        }>,
        rightComparator: Bound.Token,
        rightLimit: PrimitiveLiteral.Node<number>
    ) => {
        if (!isBoundable(s)) {
            return parserState.error(buildUnboundableMessage(s.root.toString()))
        }
        if (!isKeyOf(rightComparator, Bound.doubleTokens)) {
            return parserState.error(
                Comparators.invalidDoubleMessage(rightComparator)
            )
        }
        s.root = new Bound.LeftNode(
            s.branches.leftBound[0],
            s.branches.leftBound[1],
            new Bound.RightNode(s.root, rightComparator, rightLimit)
        )
        s.branches.leftBound = undefined as any
    }
}

export namespace RightBoundOperator {
    export type ReduceDouble<
        s extends ParserState<{
            root: BoundableNode
            branches: {
                leftBound: ParserState.OpenLeftBound
            }
        }>,
        RightComparator extends Bound.Token,
        RightLimit extends PrimitiveLiteral.Number
    > = s["root"] extends BoundableNode
        ? RightComparator extends Bound.DoubleToken
            ? ParserState.setRoot<
                  s,
                  [
                      s["branches"]["leftBound"]["0"],
                      s["branches"]["leftBound"]["1"],
                      [s["root"], RightComparator, RightLimit]
                  ]
              >
            : ParserState.error<
                  Comparators.InvalidDoubleMessage<RightComparator>
              >
        : ParserState.error<buildUnboundableMessage<Ast.ToString<s["root"]>>>
}

export namespace rightBoundOperator {
    export const reduceSingle = (
        s: parserState.WithRoot<BoundableNode>,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
    ) => {
        if (!isBoundable(s)) {
            return parserState.error(buildUnboundableMessage(s.root.toString()))
        }
        s.root = new Bound.RightNode(s.root, comparator, limit)
        return s
    }
}

export namespace RightBoundOperator {
    export type ReduceSingle<
        s extends ParserState.WithRoot<BoundableNode>,
        comparator extends Bound.Token,
        limit extends number
    > = s["root"] extends BoundableNode
        ? ParserState.setRoot<s, [s["root"], comparator, limit]>
        : ParserState.error<buildUnboundableMessage<Ast.ToString<s["root"]>>>
}

export namespace rightBoundOperator {
    export const buildUnboundableMessage = <root extends string>(
        root: root
    ): RightBoundOperator.buildUnboundableMessage<root> =>
        `Bounded expression '${root}' must be a number-or-string-typed keyword or an array-typed expression.`
}

export namespace RightBoundOperator {
    export type buildUnboundableMessage<root extends string> =
        `Bounded expression '${root}' must be a number-or-string-typed keyword or an array-typed expression.`
}

export namespace rightBoundOperator {
    export const buildInvalidLimitMessage = <
        comparator extends Bound.Token,
        limit extends string
    >(
        comparator: comparator,
        limit: limit
    ): RightBoundOperator.buildInvalidLimitMessage<comparator, limit> =>
        `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`
}

export namespace RightBoundOperator {
    export type buildInvalidLimitMessage<
        comparator extends Bound.Token,
        limit extends string
    > = `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`
}

const isBoundable = <s extends parserState.WithRoot>(
    s: s
): s is s & parserState.WithRoot<BoundableNode> => true

const isLeftBounded = <s extends parserState>(
    s: s
): s is s & { branches: { leftBound: parserState.OpenLeftBound } } =>
    !!s.branches.leftBound
