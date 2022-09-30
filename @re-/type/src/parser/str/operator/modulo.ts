import type { NodeToString } from "../../../nodes/common.js"
import { Divisibility } from "../../../nodes/nonTerminal/binary/divisibility.js"
import { NumberNode } from "../../../nodes/terminal/keyword/number.js"
import type { ParseError } from "../../common.js"
import { UnenclosedNumber } from "../operand/numeric.js"
import type { Scanner } from "../state/scanner.js"
import type { parserState, ParserState } from "../state/state.js"

export namespace ModuloOperator {
    export const parse = (s: parserState.withPreconditionRoot) => {
        if (!s.hasRoot(NumberNode)) {
            return s.error(indivisibleMessage(s.l.root.toString()))
        }
        const divisorToken = s.r.shiftUntilNextTerminator()
        return reduce(
            s,
            UnenclosedNumber.parseWellFormedInteger(
                divisorToken,
                invalidDivisorMessage(divisorToken)
            )
        )
    }

    // TODO: Check for multiple modulos/bounds etc.
    export type Parse<
        S extends ParserState,
        Unscanned extends string
    > = S extends {
        L: {
            // TODO: Actually by type
            root: "number" | "integer"
        }
    }
        ? Scanner.ShiftUntil<
              Unscanned,
              Scanner.TerminatingChar
          > extends Scanner.Shifted<infer Scanned, infer NextUnscanned>
            ? Reduce<
                  S,
                  UnenclosedNumber.ParseWellFormedInteger<
                      Scanned,
                      InvalidDivisorMessage<Scanned>
                  >,
                  NextUnscanned
              >
            : never
        : ParserState.Error<IndivisibleMessage<NodeToString<S["L"]["root"]>>>

    const reduce = (
        s: parserState.withPreconditionRoot<NumberNode>,
        parseResult: number
    ) => {
        if (parseResult === 0) {
            return s.error(invalidDivisorMessage("0"))
        }
        s.l.root = new Divisibility.Node(s.l.root, parseResult) as any
        return s
    }

    type Reduce<
        S extends ParserState,
        ParseResult extends number | ParseError<string>,
        Unscanned extends string
    > = ParseResult extends ParseError<infer Message>
        ? ParserState.Error<Message>
        : ParseResult extends 0
        ? ParserState.Error<InvalidDivisorMessage<"0">>
        : ParserState.SetRoot<S, [S["L"]["root"], "%", ParseResult], Unscanned>

    export const invalidDivisorMessage = <Divisor extends string>(
        divisor: Divisor
    ): InvalidDivisorMessage<Divisor> =>
        `Modulo operator must be followed by a non-zero integer literal (was ${divisor})`

    export type InvalidDivisorMessage<Divisor extends string> =
        `Modulo operator must be followed by a non-zero integer literal (was ${Divisor})`

    type IndivisibleMessage<Root extends string> =
        `Modulo operator must be applied to a number-typed keyword (was '${Root}')`

    export const indivisibleMessage = <Root extends string>(
        root: Root
    ): IndivisibleMessage<Root> =>
        `Modulo operator must be applied to a number-typed keyword (was '${root}')`
}
