import { Divisibility } from "../../../nodes/expression/infix/divisibility.js"
import { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import { UnenclosedNumber } from "../operand/numeric.js"
import type { Scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"

export namespace DivisibilityOperator {
    // TODO: Check for multiple modulos/bounds etc.
    export const parse = (s: ParserState.WithRoot) => {
        const divisorToken = s.scanner.shiftUntilNextTerminator()
        return reduce(
            s,
            divisorToken,
            UnenclosedNumber.parseWellFormed(
                divisorToken,
                buildInvalidDivisorMessage(divisorToken),
                "integer"
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
              scanned,
              UnenclosedNumber.parseWellFormedInteger<
                  scanned,
                  buildInvalidDivisorMessage<scanned>
              >,
              nextUnscanned
          >
        : never

    const reduce = (
        s: ParserState.WithRoot,
        divisorToken: string,
        parseResult: number
    ) => {
        if (parseResult === 0) {
            return ParserState.error(buildInvalidDivisorMessage("0"))
        }
        s.root = new Divisibility.Node(
            s.root,
            "%",
            new PrimitiveLiteral.Node(
                divisorToken as PrimitiveLiteral.Number,
                parseResult
            )
        ) as any
        return s
    }

    type reduce<
        s extends ParserState.T.WithRoot,
        divisorToken extends string,
        parsedDivisorOrErrorMessage extends number | string,
        unscanned extends string
    > = parsedDivisorOrErrorMessage extends string
        ? ParserState.error<parsedDivisorOrErrorMessage>
        : parsedDivisorOrErrorMessage extends 0
        ? ParserState.error<buildInvalidDivisorMessage<"0">>
        : ParserState.setRoot<s, [s["root"], "%", divisorToken], unscanned>

    export const buildInvalidDivisorMessage = <divisor extends string>(
        divisor: divisor
    ): buildInvalidDivisorMessage<divisor> =>
        `Modulo operator must be followed by a non-zero integer literal (was ${divisor})`

    type buildInvalidDivisorMessage<divisor extends string> =
        `Modulo operator must be followed by a non-zero integer literal (was ${divisor})`
}
