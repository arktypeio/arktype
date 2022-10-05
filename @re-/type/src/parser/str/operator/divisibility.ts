import { Divisibility } from "../../../nodes/expression/divisibility.js"
import { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { Ast } from "../../../nodes/traverse/ast.js"
import { UnenclosedNumber } from "../operand/numeric.js"
import type { Scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"

export namespace DivisibilityOperator {
    // TODO: Check for multiple modulos/bounds etc.
    export const parse = (s: ParserState.WithRoot) => {
        if (
            !ParserState.hasRoot(s, PrimitiveLiteral.Node) ||
            typeof s.root.value !== "number"
        ) {
            return ParserState.error(buildIndivisibleMessage(s.root.toString()))
        }
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
    > = s extends {
        L: {
            // TODO: Actually by type
            root: "number" | "integer"
        }
    }
        ? Scanner.shiftUntil<
              unscanned,
              Scanner.TerminatingChar
          > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
            ? reduce<
                  s,
                  scanned,
                  UnenclosedNumber.ParseWellFormedInteger<
                      scanned,
                      buildInvalidDivisorMessage<scanned>
                  >,
                  nextUnscanned
              >
            : never
        : ParserState.error<buildIndivisibleMessage<Ast.ToString<s["root"]>>>

    const reduce = (
        s: ParserState.WithRoot<PrimitiveLiteral.Node<number>>,
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

    export const buildIndivisibleMessage = <root extends string>(
        root: root
    ): buildIndivisibleMessage<root> =>
        `Modulo operator must be applied to a number-typed keyword (was '${root}')`

    type buildIndivisibleMessage<root extends string> =
        `Modulo operator must be applied to a number-typed keyword (was '${root}')`
}
