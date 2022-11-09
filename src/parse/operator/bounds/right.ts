import { isKeyOf } from "../../../utils/generics.js"
import { parseWellFormedNumber } from "../../../utils/numericLiterals.js"
import { Scanner } from "../../state/scanner.js"
import { State } from "../../state/state.js"
import { add } from "../intersection/compile.js"
import { buildInvalidDoubleMessage, invertedComparators } from "./shared.js"

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
        ? setValidatedRootOrCatch<
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
            `${invertedComparators[s.branches.range[1]]}${
                s.branches.range[0]
            }${comparator}${limit}`
        )
        s.branches.range = State.unset
        return s
    }

    type setValidatedRootOrCatch<
        s extends State.StaticWithRoot,
        comparator extends Scanner.Comparator,
        limitOrError extends string | number
    > = limitOrError extends number
        ? s["branches"]["range"] extends {}
            ? comparator extends Scanner.PairableComparator
                ? State.from<{
                      root: [
                          s["branches"]["range"][0],
                          s["branches"]["range"][1],
                          [s["root"], comparator, limitOrError]
                      ]
                      branches: {
                          range: undefined
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
}
