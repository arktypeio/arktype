import { Attributes } from "../../../attributes/attributes.js"
import { UnenclosedNumber } from "../operand/numeric.js"
import type { Scanner } from "../state/scanner.js"
import type { StaticState } from "../state/state.js"
import { DynamicState } from "../state/state.js"

export namespace DivisibilityOperator {
    export const parse = (s: DynamicState.WithRoot) => {
        const divisorToken = s.scanner.shiftUntilNextTerminator()
        return reduce(
            s,
            UnenclosedNumber.parseWellFormed(
                divisorToken,
                "integer",
                buildInvalidDivisorMessage(divisorToken)
            )
        )
    }

    export type parse<
        s extends StaticState.WithRoot,
        unscanned extends string
    > = Scanner.shiftUntil<
        unscanned,
        Scanner.TerminatingChar
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<
              s,
              UnenclosedNumber.parseWellFormedInteger<
                  scanned,
                  buildInvalidDivisorMessage<scanned>
              >,
              nextUnscanned
          >
        : never

    const reduce = (s: DynamicState.WithRoot, parseResult: number) => {
        if (parseResult === 0) {
            return DynamicState.error(buildInvalidDivisorMessage(0))
        }
        s.root = Attributes.reduce("divisor", s.root, parseResult)
        return s
    }

    type reduce<
        s extends StaticState.WithRoot,
        divisorOrError extends string | number,
        unscanned extends string
    > = divisorOrError extends number
        ? divisorOrError extends 0
            ? StaticState.error<buildInvalidDivisorMessage<0>>
            : StaticState.setRoot<
                  s,
                  [s["root"], "%", divisorOrError],
                  unscanned
              >
        : StaticState.error<`${divisorOrError}`>

    export const buildInvalidDivisorMessage = <divisor extends string | number>(
        divisor: divisor
    ): buildInvalidDivisorMessage<divisor> =>
        `% operator must be followed by a non-zero integer literal (was ${divisor})`

    type buildInvalidDivisorMessage<divisor extends string | number> =
        `% operator must be followed by a non-zero integer literal (was ${divisor})`
}
