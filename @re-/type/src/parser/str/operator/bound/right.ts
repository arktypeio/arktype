import { isKeyOf } from "@re-/tools"
import { Bound } from "../../../../nodes/expression/infix/bound.js"
import { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import type { Scanner } from "../../state/scanner.js"
import { ParserState } from "../../state/state.js"
import { Comparators } from "./tokens.js"

export namespace RightBoundOperator {
    export const parse = (s: ParserState.WithRoot, comparator: Bound.Token) => {
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
        s extends ParserState.T.WithRoot,
        comparator extends Bound.Token
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<
              ParserState.scanTo<s, nextUnscanned>,
              comparator,
              UnenclosedNumber.parseWellFormedNumber<
                  scanned,
                  buildInvalidLimitMessage<comparator, scanned>
              >
          >
        : never

    const reduce = (
        s: ParserState.WithRoot,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
    ) => {
        if (!isLeftBounded(s)) {
            s.root = new Bound.RightNode(s.root, comparator, limit)
            return s
        }
        if (!isKeyOf(comparator, Bound.doublableTokens)) {
            return ParserState.error(
                Comparators.buildInvalidDoubleMessage(comparator)
            )
        }
        s.root = new Bound.LeftNode(
            s.branches.leftBound[0],
            s.branches.leftBound[1],
            new Bound.RightNode(s.root, comparator, limit)
        )
        s.branches.leftBound = undefined as any
        return s
    }

    type reduce<
        s extends ParserState.T.WithRoot,
        comparator extends Bound.Token,
        limitTokenOrError extends string
    > = limitTokenOrError extends PrimitiveLiteral.Number
        ? s["branches"]["leftBound"] extends {}
            ? comparator extends Bound.DoublableToken
                ? ParserState.from<{
                      root: [
                          s["branches"]["leftBound"][0],
                          s["branches"]["leftBound"][1],
                          [s["root"], comparator, limitTokenOrError]
                      ]
                      branches: {
                          leftBound: null
                          intersection: s["branches"]["intersection"]
                          union: s["branches"]["union"]
                      }
                      groups: s["groups"]
                      unscanned: s["unscanned"]
                  }>
                : ParserState.error<
                      Comparators.buildInvalidDoubleMessage<comparator>
                  >
            : ParserState.setRoot<s, [s["root"], comparator, limitTokenOrError]>
        : ParserState.error<limitTokenOrError>

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

    const isLeftBounded = <s extends ParserState.Base>(
        s: s
    ): s is s & { branches: { leftBound: ParserState.OpenLeftBound } } =>
        !!s.branches.leftBound
}
