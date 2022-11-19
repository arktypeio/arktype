import type { error } from "../../../utils/generics.js"
import { tryParseWellFormedInteger } from "../../../utils/numericLiterals.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { Scanner } from "../../reduce/scanner.js"
import type { state, StaticState } from "../../reduce/static.js"

export const parseDivisor = (s: DynamicState) => {
    const divisorToken = s.scanner.shiftUntilNextTerminator()
    const value = tryParseWellFormedInteger(
        divisorToken,
        buildInvalidDivisorMessage(divisorToken)
    )
    if (value === 0) {
        s.error(buildInvalidDivisorMessage(0))
    }
    s.addAttribute("divisor", value)
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
      > extends infer result
        ? result extends number
            ? result extends 0
                ? error<buildInvalidDivisorMessage<0>>
                : state.setRoot<s, [s["root"], "%", result], nextUnscanned>
            : error<result & string>
        : never
    : never

export const buildInvalidDivisorMessage = <divisor extends string | number>(
    divisor: divisor
): buildInvalidDivisorMessage<divisor> =>
    `% operator must be followed by a non-zero integer literal (was ${divisor})`

export type buildInvalidDivisorMessage<divisor extends string | number> =
    `% operator must be followed by a non-zero integer literal (was ${divisor})`
