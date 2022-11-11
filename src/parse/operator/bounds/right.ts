import type { catches } from "../../../utils/generics.js"
import { isKeyOf } from "../../../utils/generics.js"
import { tryParseWellFormedNumber } from "../../../utils/numericLiterals.js"
import type { DynamicState } from "../../state/dynamic.js"
import type { Scanner } from "../../state/scanner.js"
import type { state, StaticState } from "../../state/static.js"
import type { buildInvalidDoubleBoundMessage } from "./shared.js"
import { invertedComparators } from "./shared.js"

export const parseRightBound = (
    s: DynamicState,
    comparator: Scanner.Comparator
) => {
    const limitToken = s.scanner.shiftUntilNextTerminator()
    const limit = tryParseWellFormedNumber(
        limitToken,
        buildInvalidLimitMessage(comparator, limitToken + s.scanner.unscanned)
    )
    //setValidatedRoot(s, comparator, limit)
}

export type parseRightBound<
    s extends StaticState,
    comparator extends Scanner.Comparator
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? tryParseWellFormedNumber<
          scanned,
          buildInvalidLimitMessage<comparator, scanned>
      > extends catches<infer limit, infer message>
        ? limit extends number
            ? s["branches"]["range"] extends {}
                ? comparator extends Scanner.PairableComparator
                    ? state.finalizeRange<
                          s,
                          s["branches"]["range"][0],
                          s["branches"]["range"][1],
                          comparator,
                          limit,
                          nextUnscanned
                      >
                    : state.error<buildInvalidDoubleBoundMessage<comparator>>
                : state.reduceSingleBound<s, limit, comparator, nextUnscanned>
            : state.error<message>
        : never
    : never

// const setValidatedRoot = (
//     s: DynamicState,
//     comparator: Scanner.Comparator,
//     limit: number
// ) => {
//     if (!stateHasOpenRange(s)) {
//         s.root.intersect("bounds", `${comparator}${limit}`)
//         return s
//     }
//     if (!isKeyOf(comparator, Scanner.pairableComparators)) {
//         return s.error(buildInvalidDoubleBoundMessage(comparator))
//     }
//     s.root.intersect(
//         "bounds",
//         `${invertedComparators[s.branches.range[1]]}${
//             s.branches.range[0]
//         }${comparator}${limit}`
//     )
//     s.branches.range = unset
// }

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
