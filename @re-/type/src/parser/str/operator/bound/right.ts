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

export namespace RightBoundOperator {
    // TODO: Fix
    type BoundableNode = any

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

    export type parse<
        s extends ParserState.WithRoot,
        comparator extends Bound.Token
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<
              s,
              comparator,
              scanned,
              UnenclosedNumber.ParseWellFormedNumber<
                  scanned,
                  buildInvalidLimitMessage<comparator, scanned>
              >,
              nextUnscanned
          >
        : never

    const reduce = (
        s: parserState.WithRoot,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
    ) =>
        isLeftBounded(s)
            ? reduceDouble(s, comparator, limit)
            : reduceSingle(s, comparator, limit)

    type reduce<
        s extends ParserState.WithRoot,
        comparator extends Bound.Token,
        limitToken extends string,
        limitParseResult extends string | number,
        unscanned extends string
    > = limitParseResult extends string
        ? ParserState.error<limitParseResult>
        : s["branches"]["leftBound"] extends {}
        ? reduceDouble<
              ParserState.from<{
                  root: ParserState.mergeIntersectionAndUnion<s>
                  branches: {
                      leftBound: s["branches"]["leftBound"]
                      union: null
                      intersection: null
                  }
                  groups: s["groups"]
                  unscanned: unscanned
              }>,
              comparator,
              limitToken & PrimitiveLiteral.Number
          >
        : reduceSingle<s, comparator, limitParseResult & number>

    const reduceDouble = (
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
                Comparators.buildInvalidDoubleMessage(rightComparator)
            )
        }
        parserState.mergeIntersectionAndUnionToRoot(s)
        s.root = new Bound.LeftNode(
            s.branches.leftBound[0],
            s.branches.leftBound[1],
            new Bound.RightNode(s.root, rightComparator, rightLimit)
        )
        s.branches.leftBound = undefined as any
    }

    type reduceDouble<
        s extends ParserState<{
            root: BoundableNode
            branches: {
                leftBound: ParserState.OpenLeftBound
            }
        }>,
        rightComparator extends Bound.Token,
        rightLimit extends PrimitiveLiteral.Number
    > = s["root"] extends BoundableNode
        ? rightComparator extends Bound.DoubleToken
            ? ParserState.setRoot<
                  s,
                  [
                      s["branches"]["leftBound"][0],
                      s["branches"]["leftBound"][1],
                      [s["root"], rightComparator, rightLimit]
                  ]
              >
            : ParserState.error<
                  Comparators.buildInvalidDoubleMessage<rightComparator>
              >
        : ParserState.error<buildUnboundableMessage<Ast.ToString<s["root"]>>>

    const reduceSingle = (
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

    type reduceSingle<
        s extends ParserState.WithRoot<BoundableNode>,
        comparator extends Bound.Token,
        limit extends number
    > = s["root"] extends BoundableNode
        ? ParserState.setRoot<s, [s["root"], comparator, limit]>
        : ParserState.error<buildUnboundableMessage<Ast.ToString<s["root"]>>>

    export const buildUnboundableMessage = <root extends string>(
        root: root
    ): buildUnboundableMessage<root> =>
        `Bounded expression '${root}' must be a number-or-string-typed keyword or an array-typed expression.`

    type buildUnboundableMessage<root extends string> =
        `Bounded expression '${root}' must be a number-or-string-typed keyword or an array-typed expression.`

    export const buildInvalidLimitMessage = <
        comparator extends Bound.Token,
        limit extends string
    >(
        comparator: comparator,
        limit: limit
    ): buildInvalidLimitMessage<comparator, limit> =>
        `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`

    type buildInvalidLimitMessage<
        comparator extends Bound.Token,
        limit extends string
    > = `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`

    const isBoundable = <s extends parserState.WithRoot>(
        s: s
    ): s is s & parserState.WithRoot<BoundableNode> => true

    const isLeftBounded = <s extends parserState>(
        s: s
    ): s is s & { branches: { leftBound: parserState.OpenLeftBound } } =>
        !!s.branches.leftBound
}
