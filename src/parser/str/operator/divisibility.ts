import { Divisibility } from "../../../nodes/expression/infix/divisibility.js"
import type { NumberLiteral } from "../../../nodes/terminal/literal/number.js"
import { UnenclosedNumber } from "../operand/numeric.js"
import type { Scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"

export namespace DivisibilityOperator {
    export const parse = (s: ParserState.WithRoot) => {
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
        s extends ParserState.T.WithRoot,
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

    const reduce = (s: ParserState.WithRoot, parseResult: number) => {
        if (parseResult === 0) {
            return ParserState.error(buildInvalidDivisorMessage("0"))
        }
        s.attributes?.add("divisor", parseResult)
        s.root = new Divisibility.Node(s.root, parseResult) as any
        return s
    }

    type reduce<
        s extends ParserState.T.WithRoot,
        divisorTokenOrError extends string,
        unscanned extends string
    > = divisorTokenOrError extends NumberLiteral.IntegerDefinition
        ? divisorTokenOrError extends "0"
            ? ParserState.error<buildInvalidDivisorMessage<"0">>
            : ParserState.setRoot<
                  s,
                  [s["root"], "%", divisorTokenOrError],
                  unscanned
              >
        : ParserState.error<divisorTokenOrError>

    export const buildInvalidDivisorMessage = <divisor extends string>(
        divisor: divisor
    ): buildInvalidDivisorMessage<divisor> =>
        `% operator must be followed by a non-zero integer literal (was ${divisor})`

    type buildInvalidDivisorMessage<divisor extends string> =
        `% operator must be followed by a non-zero integer literal (was ${divisor})`
}
