import { stringifyBounds } from "../../../../attributes/bounds.js"
import { assignIntersection } from "../../../../attributes/intersection.js"
import { isKeyOf } from "../../../../utils/generics.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import { Scanner } from "../../state/scanner.js"
import { State } from "../../state/state.js"
import { buildInvalidDoubleMessage, toBoundsAttribute } from "./shared.js"

export namespace RightBoundOperator {
    export const parse = (
        s: State.DynamicWithRoot,
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
        return setValidatedRoot(s, comparator, limit)
    }

    export type parse<
        s extends State.StaticWithRoot,
        comparator extends Scanner.Comparator
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? setValidatedRootOrCatch<
              State.scanTo<s, nextUnscanned>,
              comparator,
              UnenclosedNumber.parseWellFormedNumber<
                  scanned,
                  buildInvalidLimitMessage<comparator, scanned>
              >
          >
        : never

    const setValidatedRoot = (
        s: State.DynamicWithRoot,
        comparator: Scanner.Comparator,
        limit: number
    ) => {
        const boundsData = toBoundsAttribute(comparator, limit)
        if (!isLeftBounded(s)) {
            s.root = assignIntersection(
                s.root,
                { bounds: stringifyBounds(boundsData) },
                s.context
            )
            return s
        }
        if (!isKeyOf(comparator, Scanner.pairableComparators)) {
            return State.error(buildInvalidDoubleMessage(comparator))
        }
        boundsData.min = {
            limit: s.branches.leftBound[0],
            inclusive: s.branches.leftBound[1] === "<="
        }
        s.root = assignIntersection(
            s.root,
            {
                bounds: stringifyBounds(boundsData)
            },
            s.context
        )
        s.branches.leftBound = State.unset
        return s
    }

    type setValidatedRootOrCatch<
        s extends State.StaticWithRoot,
        comparator extends Scanner.Comparator,
        limitOrError extends string | number
    > = limitOrError extends number
        ? s["branches"]["leftBound"] extends {}
            ? comparator extends Scanner.PairableComparator
                ? State.from<{
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
                : State.error<buildInvalidDoubleMessage<comparator>>
            : State.setRoot<s, [s["root"], comparator, limitOrError]>
        : State.error<`${limitOrError}`>

    export const buildInvalidLimitMessage = <
        comparator extends Scanner.Comparator,
        limit extends string
    >(
        comparator: comparator,
        limit: limit
    ): buildInvalidLimitMessage<comparator, limit> =>
        `Right comparator ${comparator} must be followed by a number literal (was '${limit}')`

    type buildInvalidLimitMessage<
        comparator extends Scanner.Comparator,
        limit extends string
    > = `Right comparator ${comparator} must be followed by a number literal (was '${limit}')`

    const isLeftBounded = <s extends State.DynamicWithRoot>(
        s: s
    ): s is s & { branches: { leftBound: State.OpenLeftBound } } =>
        !!s.branches.leftBound
}
