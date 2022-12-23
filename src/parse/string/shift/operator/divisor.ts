import type { error } from "../../../../utils/generics.ts"
import { tryParseWellFormedInteger } from "../../../../utils/numericLiterals.ts"
import type { DynamicState } from "../../reduce/dynamic.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import type { Scanner } from "../scanner.ts"

export const parseDivisor = (s: DynamicState) => {
    const divisorToken = s.scanner.shiftUntilNextTerminator()
    const divisor = tryParseWellFormedInteger(
        divisorToken,
        buildInvalidDivisorMessage(divisorToken)
    )
    if (divisor === 0) {
        s.error(buildInvalidDivisorMessage(0))
    }
    s.intersect({ number: { divisor } })
}

export type parseDivisor<
    s extends StaticState,
    unscanned extends string
> = Scanner.shiftUntilNextTerminator<unscanned> extends Scanner.shiftResult<
    infer scanned,
    infer nextUnscanned
>
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
