import type { catches } from "../../utils/generics.js"
import { tryParseWellFormedInteger } from "../../utils/numericLiterals.js"
import type { DynamicState } from "../state/dynamic.js"
import type { Scanner } from "../state/scanner.js"
import type { state, StaticState } from "../state/static.js"

export const parseDivisor = (s: DynamicState) => {
    const divisorToken = s.scanner.shiftUntilNextTerminator()
    const value = tryParseWellFormedInteger(
        divisorToken,
        buildInvalidDivisorMessage(divisorToken)
    )
    if (value === 0) {
        s.error(buildInvalidDivisorMessage(0))
    }
}

export type parseDivisor<
    s extends StaticState,
    unscanned extends string
> = Scanner.shiftUntil<
    unscanned,
    Scanner.TerminatingChar
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? tryParseWellFormedInteger<
          scanned,
          buildInvalidDivisorMessage<scanned>
      > extends catches<infer divisor, infer message>
        ? divisor extends number
            ? divisor extends 0
                ? state.error<buildInvalidDivisorMessage<0>>
                : state.setRoot<s, [s["root"], "%", divisor], nextUnscanned>
            : state.error<message>
        : never
    : never

export const buildInvalidDivisorMessage = <divisor extends string | number>(
    divisor: divisor
): buildInvalidDivisorMessage<divisor> =>
    `% operator must be followed by a non-zero integer literal (was ${divisor})`

type buildInvalidDivisorMessage<divisor extends string | number> =
    `% operator must be followed by a non-zero integer literal (was ${divisor})`
