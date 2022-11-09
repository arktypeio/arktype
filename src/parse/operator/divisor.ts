import type { NumberLiteral } from "../../utils/numericLiterals.js"
import { parseWellFormedInteger } from "../../utils/numericLiterals.js"
import type { OperateAttribute } from "../state/attributes/operations.js"
import type { Scanner } from "../state/scanner.js"
import type {
    DynamicWithRoot,
    setStateRoot,
    StaticWithRoot
} from "../state/state.js"
import { errorState } from "../state/state.js"

export const parseDivisor = (s: DynamicWithRoot) => {
    const divisorToken = s.scanner.shiftUntilNextTerminator()
    return setRootOrCatch(
        s,
        parseWellFormedInteger(
            divisorToken,
            buildInvalidDivisorMessage(divisorToken)
        )
    )
}

export type parseDivisor<
    s extends StaticWithRoot,
    unscanned extends string
> = Scanner.shiftUntil<
    unscanned,
    Scanner.TerminatingChar
> extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
    ? setRootOrCatch<
          s,
          parseWellFormedInteger<scanned, buildInvalidDivisorMessage<scanned>>,
          nextUnscanned
      >
    : never

const setRootOrCatch = (s: DynamicWithRoot, parseResult: number) => {
    if (parseResult === 0) {
        return errorState(buildInvalidDivisorMessage(0))
    }
    s.root.intersect("divisor", `${parseResult}`)
    return s
}

type setRootOrCatch<
    s extends StaticWithRoot,
    divisorOrError extends string | number,
    unscanned extends string
> = divisorOrError extends number
    ? divisorOrError extends 0
        ? errorState<buildInvalidDivisorMessage<0>>
        : setStateRoot<s, [s["root"], "%", divisorOrError], unscanned>
    : errorState<`${divisorOrError}`>

export const buildInvalidDivisorMessage = <divisor extends string | number>(
    divisor: divisor
): buildInvalidDivisorMessage<divisor> =>
    `% operator must be followed by a non-zero integer literal (was ${divisor})`

type buildInvalidDivisorMessage<divisor extends string | number> =
    `% operator must be followed by a non-zero integer literal (was ${divisor})`

export const operateDivisor: OperateAttribute<NumberLiteral> = (
    serializedA,
    serializedB,
    operation
) => {
    const a = parseWellFormedInteger(serializedA, true)
    const b = parseWellFormedInteger(serializedB, true)
    return operation === "&"
        ? `${Math.abs((a * b) / greatestCommonDivisor(a, b))}`
        : `${a / greatestCommonDivisor(a, b)}`
}

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (a: number, b: number) => {
    let previous
    let greatestCommonDivisor = a
    let current = b
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return greatestCommonDivisor
}
