import type { NumberLiteral } from "../../../../utils/numericLiterals.js"
import { tryParseWellFormedInteger } from "../../../../utils/numericLiterals.js"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"

export const parseDivisor = (s: DynamicStateWithRoot) => {
    const divisorToken = s.scanner.shiftUntilNextTerminator()
    const divisor = tryParseWellFormedInteger(
        divisorToken,
        writeInvalidDivisorMessage(divisorToken)
    )
    if (divisor === 0) {
        s.error(writeInvalidDivisorMessage(0))
    }
    s.root = s.root.constrain("divisor", divisor)
}

export type parseDivisor<
    s extends StaticState,
    unscanned extends string
> = Scanner.shiftUntilNextTerminator<
    Scanner.skipWhitespace<unscanned>
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? scanned extends NumberLiteral<infer divisor>
        ? divisor extends 0
            ? state.error<writeInvalidDivisorMessage<0>>
            : state.setRoot<s, [s["root"], "%", scanned], nextUnscanned>
        : state.error<writeInvalidDivisorMessage<scanned>>
    : never

export const writeInvalidDivisorMessage = <divisor extends string | number>(
    divisor: divisor
): writeInvalidDivisorMessage<divisor> =>
    `% operator must be followed by a non-zero integer literal (was ${divisor})`

export type writeInvalidDivisorMessage<divisor extends string | number> =
    `% operator must be followed by a non-zero integer literal (was ${divisor})`
