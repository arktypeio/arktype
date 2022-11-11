import type { tryCatch } from "../../utils/generics.js"
import { parseWellFormedInteger } from "../../utils/numericLiterals.js"
import type { DynamicState } from "../state/dynamic.js"
import type { Scanner } from "../state/scanner.js"
import type { state, StaticWithRoot } from "../state/static.js"

export const parseDivisor = (s: DynamicState) => {
    const divisorToken = s.scanner.shiftUntilNextTerminator()
    const value = parseWellFormedInteger(
        divisorToken,
        buildInvalidDivisorMessage(divisorToken)
    )
    if (value === 0) {
        return s.error(buildInvalidDivisorMessage(0))
    }
    return s.intersect("divisor", divisorToken)
}

export type parseDivisor<
    s extends StaticWithRoot,
    unscanned extends string
> = Scanner.shiftUntil<
    unscanned,
    Scanner.TerminatingChar
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? parseWellFormedInteger<
          scanned,
          buildInvalidDivisorMessage<scanned>
      > extends tryCatch<infer divisor, infer error>
        ? divisor extends number
            ? divisor extends 0
                ? state.error<buildInvalidDivisorMessage<0>>
                : state.setRoot<s, [s["root"], "%", divisor], nextUnscanned>
            : state.error<error>
        : never
    : never

export const buildInvalidDivisorMessage = <divisor extends string | number>(
    divisor: divisor
): buildInvalidDivisorMessage<divisor> =>
    `% operator must be followed by a non-zero integer literal (was ${divisor})`

type buildInvalidDivisorMessage<divisor extends string | number> =
    `% operator must be followed by a non-zero integer literal (was ${divisor})`
