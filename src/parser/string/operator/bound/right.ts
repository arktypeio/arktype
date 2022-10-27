import { Attributes } from "../../../../attributes/attributes2.js"
import { isKeyOf } from "../../../../utils/generics.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import { Scanner } from "../../state/scanner.js"
import type { StaticState } from "../../state/state.js"
import { DynamicState } from "../../state/state.js"
import { buildInvalidDoubleMessage, invertedComparators } from "./shared.js"

export namespace RightBoundOperator {
    export const parse = (
        s: DynamicState.WithRoot,
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
        s extends StaticState.WithRoot,
        comparator extends Scanner.Comparator
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<
              StaticState.scanTo<s, nextUnscanned>,
              comparator,
              UnenclosedNumber.parseWellFormedNumber<
                  scanned,
                  buildInvalidLimitMessage<comparator, scanned>
              >
          >
        : never

    const reduce = (
        s: DynamicState.WithRoot,
        comparator: Scanner.Comparator,
        limit: number
    ) => {
        s.root = Attributes.reduce("bound", s.root, comparator, limit)
        if (!isLeftBounded(s)) {
            return s
        }
        if (!isKeyOf(comparator, Scanner.pairableComparators)) {
            return DynamicState.error(buildInvalidDoubleMessage(comparator))
        }
        s.root = Attributes.reduce(
            "bound",
            s.root,
            invertedComparators[s.branches.leftBound[1]],
            s.branches.leftBound[0]
        )
        s.branches.leftBound = DynamicState.unset
        return s
    }

    type reduce<
        s extends StaticState.WithRoot,
        comparator extends Scanner.Comparator,
        limitOrError extends string | number
    > = limitOrError extends number
        ? s["branches"]["leftBound"] extends {}
            ? comparator extends Scanner.PairableComparator
                ? StaticState.from<{
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
                : StaticState.error<buildInvalidDoubleMessage<comparator>>
            : StaticState.setRoot<s, [s["root"], comparator, limitOrError]>
        : StaticState.error<`${limitOrError}`>

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

    const isLeftBounded = <s extends DynamicState>(
        s: s
    ): s is s & { branches: { leftBound: DynamicState.OpenLeftBound } } =>
        !!s.branches.leftBound
}
