import { isKeyOf } from "../../../utils/generics.js"
import { parseWellFormedNumber } from "../../../utils/numericLiterals.js"
import { add } from "../../state/intersection.js"
import { Scanner } from "../../state/scanner.js"
import { State } from "../../state/state.js"
import { buildInvalidDoubleMessage } from "./shared.js"

export namespace RightBound {
    export const parse = (
        s: State.DynamicWithRoot,
        comparator: Scanner.Comparator
    ) => {
        const limitToken = s.scanner.shiftUntilNextTerminator()
        const limit = parseWellFormedNumber(
            limitToken,
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
        ? catchAndValidate<
              State.scanTo<s, nextUnscanned>,
              comparator,
              parseWellFormedNumber<
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
        if (!State.hasOpenRange(s)) {
            s.root = add(s.root, "bounds", `${comparator}${limit}`)
            return s
        }
        if (!isKeyOf(comparator, Scanner.pairableComparators)) {
            return State.error(buildInvalidDoubleMessage(comparator))
        }
        s.root = add(
            s.root,
            "bounds",
            `${s.branches.range}${comparator}${limit}`
        )
        s.branches.range = State.unset
        return s
    }

    type catchAndValidate<
        s extends State.StaticWithRoot,
        comparator extends Scanner.Comparator,
        limitOrError extends string | number
    > = limitOrError extends string
        ? State.error<`${limitOrError}`>
        : s["branches"]["range"] extends undefined
        ? s
        : comparator extends Scanner.PairableComparator
        ? State.from<{
              root: s["root"]
              branches: {
                  range: undefined
                  intersection: s["branches"]["intersection"]
                  union: s["branches"]["union"]
              }
              groups: s["groups"]
              unscanned: s["unscanned"]
          }>
        : State.error<buildInvalidDoubleMessage<comparator>>

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
}
