import { Attributes } from "../../../../attributes/attributes.js"
import { isKeyOf } from "../../../../utils/generics.js"
import type { NumberLiteral } from "../../operand/numeric.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import { Scanner } from "../../state/scanner.js"
import { ParserState } from "../../state/state.js"
import { buildInvalidDoubleMessage, invertedComparators } from "./shared.js"

export namespace RightBoundOperator {
    export const parse = (
        s: ParserState.WithRoot,
        comparator: Scanner.Comparator
    ) => {
        const limitToken = s.scanner.shiftUntilNextTerminator()
        const limit = UnenclosedNumber.parseWellFormed(
            limitToken,
            "number",
            buildInvalidLimitMessage(
                comparator,
                limitToken + s.scanner.unscanned
            )
        )
        return reduce(s, comparator, limit)
    }

    export type parse<
        s extends ParserState.T.WithRoot,
        comparator extends Scanner.Comparator
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
        comparator: Scanner.Comparator,
        limit: number
    ) => {
        if (!isLeftBounded(s)) {
            Attributes.add(s.root, "bound", comparator, limit)
            return s
        }
        if (!isKeyOf(comparator, Scanner.pairableComparators)) {
            return ParserState.error(buildInvalidDoubleMessage(comparator))
        }
        Attributes.add(
            s.root,
            "bound",
            invertedComparators[s.branches.leftBound[1]],
            s.branches.leftBound[0]
        )
        Attributes.add(s.root, "bound", comparator, limit)
        s.branches.leftBound = ParserState.unset
        return s
    }

    type reduce<
        s extends ParserState.T.WithRoot,
        comparator extends Scanner.Comparator,
        limitOrError extends string | number
    > = limitOrError extends number
        ? s["branches"]["leftBound"] extends {}
            ? comparator extends Scanner.PairableComparator
                ? ParserState.from<{
                      root: [
                          s["branches"]["leftBound"][0],
                          s["branches"]["leftBound"][1],
                          [s["root"], comparator, limitOrError]
                      ]
                      branches: {
                          leftBound: null
                          intersection: s["branches"]["intersection"]
                          union: s["branches"]["union"]
                      }
                      groups: s["groups"]
                      unscanned: s["unscanned"]
                  }>
                : ParserState.error<buildInvalidDoubleMessage<comparator>>
            : ParserState.setRoot<s, [s["root"], comparator, limitOrError]>
        : ParserState.error<`${limitOrError}`>

    export const buildInvalidLimitMessage = <
        comparator extends Scanner.Comparator,
        limit extends string
    >(
        comparator: comparator,
        limit: limit
    ): buildInvalidLimitMessage<comparator, limit> =>
        `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`

    type buildInvalidLimitMessage<
        comparator extends Scanner.Comparator,
        limit extends string
    > = `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`

    const isLeftBounded = <s extends ParserState.Base>(
        s: s
    ): s is s & { branches: { leftBound: ParserState.OpenLeftBound } } =>
        !!s.branches.leftBound
}
