import type { error } from "../../../../utils/generics.ts"
import { keysOf } from "../../../../utils/generics.ts"
import { tryParseWellFormedInteger } from "../../../../utils/numericLiterals.ts"
import { writeIndivisibleMessage } from "../../../ast/divisor.ts"
import type { DynamicState } from "../../reduce/dynamic.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import type { Scanner } from "../scanner.ts"

export const parseDivisor = (s: DynamicState) => {
    const divisorToken = s.scanner.shiftUntilNextTerminator()
    const divisor = tryParseWellFormedInteger(
        divisorToken,
        writeInvalidDivisorMessage(divisorToken)
    )
    if (divisor === 0) {
        s.error(writeInvalidDivisorMessage(0))
    }
    const rootDomains = keysOf(s.resolveRoot())
    if (rootDomains.length === 1 && rootDomains[0] === "number") {
        s.intersect({ number: { divisor } })
    } else {
        s.error(writeIndivisibleMessage(s.rootToString()))
    }
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
          writeInvalidDivisorMessage<scanned>
      > extends infer divisor
        ? divisor extends number
            ? divisor extends 0
                ? error<writeInvalidDivisorMessage<0>>
                : state.setRoot<
                      s,
                      [s["root"], "%", `${divisor}`],
                      nextUnscanned
                  >
            : error<divisor & string>
        : never
    : never

export const writeInvalidDivisorMessage = <divisor extends string | number>(
    divisor: divisor
): writeInvalidDivisorMessage<divisor> =>
    `% operator must be followed by a non-zero integer literal (was ${divisor})`

export type writeInvalidDivisorMessage<divisor extends string | number> =
    `% operator must be followed by a non-zero integer literal (was ${divisor})`
