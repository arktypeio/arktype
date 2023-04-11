import { TypeNode } from "../../../../nodes/type.js"
import type { error } from "../../../../utils/generics.js"
import { keysOf } from "../../../../utils/generics.js"
import { tryParseWellFormedInteger } from "../../../../utils/numericLiterals.js"
import { stringify } from "../../../../utils/serialize.js"
import { writeIndivisibleMessage } from "../../../ast/divisor.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"

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
        s.intersect(TypeNode.from({ domain: "number", divisor }))
    } else {
        s.error(writeIndivisibleMessage(stringify(s.root)))
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
