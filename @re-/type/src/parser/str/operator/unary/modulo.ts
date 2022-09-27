import type { NodeToString } from "../../../../nodes/common.js"
import type { AddConstraints } from "../../../../nodes/constraints/constraint.js"
import type { NumberTypedKeyword } from "../../../../nodes/terminals/keywords/number.js"
import {
    ModuloConstraint,
    NumberNode
} from "../../../../nodes/terminals/keywords/number.js"
import type { NumberLiteralDefinition } from "../../../../nodes/terminals/literal.js"
import { throwParseError } from "../../../../parser/common.js"
import type { IntegerLiteralDefinition } from "../../operand/unenclosed.js"
import { isIntegerLiteral } from "../../operand/unenclosed.js"
import type { left } from "../../state/left.js"
import type { Scanner, scanner } from "../../state/scanner.js"
import type { parserState, ParserState } from "../../state/state.js"
import { comparatorChars } from "./bound/common.js"
import { shiftComparator } from "./bound/parse.js"

// TODO: Check for multiple modulos/bounds etc.
export type ParseModulo<
    S extends ParserState,
    Unscanned extends string
> = S extends {
    L: {
        root: NumberTypedKeyword
    }
}
    ? Scanner.ShiftUntil<
          Unscanned,
          Scanner.TerminatingChar
      > extends Scanner.Shifted<infer Scanned, infer NextUnscanned>
        ? Scanned extends IntegerLiteralDefinition<infer Divisor>
            ? ReduceModulo<S, Divisor, NextUnscanned>
            : ParserState.Error<InvalidDivisorMessage<Scanned>>
        : never
    : ParserState.Error<IndivisibleMessage<NodeToString<S["L"]["root"]>>>

export const parseModulo = (s: parserState.withRoot) => {
    const moduloValue = s.r.shiftUntil(untilPostModuloSuffix)
    const nextSuffix = s.r.lookaheadIsIn(comparatorChars)
        ? shiftComparator(s, s.r.shift())
        : (s.r.shift() as "?" | "END")
    return isIntegerLiteral(moduloValue)
        ? s.hasRoot(NumberNode)
            ? reduceModulo(s, integerLiteralToDivisorValue(moduloValue))
            : s.error(indivisibleMessage(s.l.root.toString()))
        : s.error(
              invalidDivisorMessage(
                  `${moduloValue}${nextSuffix === "END" ? "" : nextSuffix}${
                      s.r.unscanned
                  }`
              )
          )
}

const reduceModulo = (
    s: parserState<left.withRoot<NumberNode>>,
    value: number
) => {
    s.l.root.modulo = new ModuloConstraint(value)
    return s
}

type ReduceModulo<
    S extends ParserState.WithRoot<NumberTypedKeyword>,
    Value extends bigint,
    Unscanned extends string
> = Value extends 0n
    ? ParserState.Error<InvalidDivisorMessage<"0">>
    : ParserState.SetRoot<
          S,
          AddConstraints<S["L"]["root"], [["%", BigintToNumber<Value>]]>,
          Unscanned
      >

type BigintToNumber<Value extends bigint> =
    `${Value}` extends NumberLiteralDefinition<infer NumericValue>
        ? NumericValue
        : never

const integerLiteralToDivisorValue = (definition: IntegerLiteralDefinition) => {
    const value = parseInt(definition)
    if (Number.isNaN(value)) {
        throwParseError(
            `Unexpectedly failed to parse an integer from '${value}'.`
        )
    }
    if (value === 0) {
        throwParseError(invalidDivisorMessage("0"))
    }
    return value
}

export const invalidDivisorMessage = <Divisor extends string>(
    divisor: Divisor
): InvalidDivisorMessage<Divisor> =>
    `Modulo operator must be followed by an integer literal (was ${divisor})`

export type InvalidDivisorMessage<Divisor extends string> =
    `Modulo operator must be followed by an integer literal (was ${Divisor})`

const untilPostModuloSuffix: scanner.UntilCondition = (scanner) =>
    scanner.lookahead === "?" || scanner.lookaheadIsIn(comparatorChars)

type IndivisibleMessage<Root extends string> =
    `Modulo operator must be applied to a number-typed keyword (was '${Root}')`

export const indivisibleMessage = <Root extends string>(
    root: Root
): IndivisibleMessage<Root> =>
    `Modulo operator must be applied to a number-typed keyword (was '${root}')`
