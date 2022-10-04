import { Divisibility } from "../../../nodes/expression/divisibility.js"
import { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { Ast } from "../../../nodes/traverse/ast.js"
import { UnenclosedNumber } from "../operand/numeric.js"
import type { Scanner } from "../state/scanner.js"
import { parserState } from "../state/state.js"
import type { ParserState } from "../state/state.js"

export namespace divisibilityOperator {
    // TODO: Check for multiple modulos/bounds etc.
    export const parse = (s: parserState.WithRoot) => {
        if (
            !parserState.hasRoot(s, PrimitiveLiteral.Node) ||
            typeof s.root.value !== "number"
        ) {
            return parserState.error(buildIndivisibleMessage(s.root.toString()))
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
}

export namespace DivisibilityOperator {
    export type Parse<
        S extends ParserState,
        unscanned extends string
    > = S extends {
        L: {
            // TODO: Actually by type
            root: "number" | "integer"
        }
    }
        ? Scanner.shiftUntil<
              unscanned,
              Scanner.TerminatingChar
          > extends Scanner.ShiftResult<infer Scanned, infer NextUnscanned>
            ? reduce<
                  S,
                  Scanned,
                  UnenclosedNumber.ParseWellFormedInteger<
                      Scanned,
                      buildInvalidDivisorMessage<Scanned>
                  >,
                  NextUnscanned
              >
            : never
        : ParserState.error<buildIndivisibleMessage<Ast.ToString<S["root"]>>>
}

export namespace divisibilityOperator {
    export const reduce = (
        s: parserState.WithRoot<PrimitiveLiteral.Node<number>>,
        divisorToken: string,
        parseResult: number
    ) => {
        if (parseResult === 0) {
            return parserState.error(buildInvalidDivisorMessage("0"))
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
}

export namespace DivisibilityOperator {
    export type reduce<
        s extends ParserState,
        divisorToken extends string,
        parsedDivisorOrErrorMessage extends number | string,
        unscanned extends string
    > = parsedDivisorOrErrorMessage extends string
        ? ParserState.error<parsedDivisorOrErrorMessage>
        : parsedDivisorOrErrorMessage extends 0
        ? ParserState.error<buildInvalidDivisorMessage<"0">>
        : ParserState.setRoot<s, [s["root"], "%", divisorToken], unscanned>
}

export namespace divisibilityOperator {
    export const buildInvalidDivisorMessage = <divisor extends string>(
        divisor: divisor
    ): DivisibilityOperator.buildInvalidDivisorMessage<divisor> =>
        `Modulo operator must be followed by a non-zero integer literal (was ${divisor})`
}

export namespace DivisibilityOperator {
    export type buildInvalidDivisorMessage<divisor extends string> =
        `Modulo operator must be followed by a non-zero integer literal (was ${divisor})`
}

export namespace divisibilityOperator {
    export const buildIndivisibleMessage = <root extends string>(
        root: root
    ): DivisibilityOperator.buildIndivisibleMessage<root> =>
        `Modulo operator must be applied to a number-typed keyword (was '${root}')`
}

export namespace DivisibilityOperator {
    export type buildIndivisibleMessage<root extends string> =
        `Modulo operator must be applied to a number-typed keyword (was '${root}')`
}
