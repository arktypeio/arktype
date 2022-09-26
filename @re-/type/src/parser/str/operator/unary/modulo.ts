import type { NodeToString } from "../../../../nodes/common.js"
import type { NumberTypedKeyword } from "../../../../nodes/terminals/keywords/number.js"
import {
    ModuloConstraint,
    NumberNode
} from "../../../../nodes/terminals/keywords/number.js"
import type { NumberLiteralDefinition } from "../../../../nodes/terminals/literal.js"
import { throwParseError } from "../../../../parser/common.js"
import type { IntegerLiteralDefinition } from "../../operand/unenclosed.js"
import { isIntegerLiteral } from "../../operand/unenclosed.js"
import type { left, Left } from "../../state/left.js"
import type {
    InvalidSuffixMessage,
    Scanner,
    scanner
} from "../../state/scanner.js"
import { invalidSuffixMessage } from "../../state/scanner.js"
import type { parserState, ParserState } from "../../state/state.js"
import { comparatorChars } from "./bound/common.js"
import { shiftComparator } from "./bound/parse.js"

export type ParseModulo<S extends ParserState.Of<Left.Suffix>> =
    S["L"] extends { root: NumberTypedKeyword }
        ? S["R"] extends ModuloValueFollowedByTwoCharSuffix<
              infer Value,
              Scanner.TwoCharSuffix,
              infer Unscanned
          >
            ? S["R"] extends ModuloValueFollowedByTwoCharSuffix<
                  Value,
                  infer NextSuffix,
                  Unscanned
              >
                ? ParserState.From<{
                      L: ReduceModulo<S["L"], Value, NextSuffix>
                      R: Unscanned
                  }>
                : never
            : S["R"] extends ModuloValueFollowedByOneCharSuffix<
                  infer Value,
                  Scanner.OneCharSuffix,
                  infer Unscanned
              >
            ? S["R"] extends ModuloValueFollowedByOneCharSuffix<
                  Value,
                  infer NextSuffix,
                  Unscanned
              >
                ? ParserState.From<{
                      L: ReduceModulo<S["L"], Value, NextSuffix>
                      R: Unscanned
                  }>
                : never
            : S["R"] extends IntegerLiteralDefinition<infer Value>
            ? ParserState.From<{
                  L: ReduceModulo<S["L"], Value, "END">
                  R: ""
              }>
            : ParserState.Error<
                  InvalidSuffixMessage<"%", S["R"], "an integer literal">
              >
        : ParserState.Error<IndivisibleMessage<NodeToString<S["L"]["root"]>>>

type ModuloValueFollowedByOneCharSuffix<
    Value extends bigint,
    NextSuffix extends Scanner.OneCharSuffix,
    Unscanned extends string
> = `${Value}${NextSuffix}${Unscanned}`

type ModuloValueFollowedByTwoCharSuffix<
    Value extends bigint,
    NextSuffix extends Scanner.TwoCharSuffix,
    Unscanned extends string
> = `${Value}${NextSuffix}${Unscanned}`

export const parseModulo = (s: parserState<left.suffix>) => {
    const moduloValue = s.r.shiftUntil(untilPostModuloSuffix)
    const nextSuffix = s.r.lookaheadIsIn(comparatorChars)
        ? shiftComparator(s, s.r.shift())
        : (s.r.shift() as "?" | "END")
    return isIntegerLiteral(moduloValue)
        ? s.hasRoot(NumberNode)
            ? reduceModulo(
                  s,
                  integerLiteralToDivisorValue(moduloValue),
                  nextSuffix
              )
            : s.error(indivisibleMessage(s.l.root.toString()))
        : s.error(
              invalidSuffixMessage(
                  "%",
                  `${moduloValue}${nextSuffix === "END" ? "" : nextSuffix}${
                      s.r.unscanned
                  }`,
                  "an integer literal"
              )
          )
}

const reduceModulo = (
    s: parserState<left.suffix<{ root: NumberNode }>>,
    value: number,
    nextSuffix: Scanner.Suffix
) => {
    s.l.root.modulo = new ModuloConstraint(value)
    s.l.nextSuffix = nextSuffix
    return s
}

type ReduceModulo<
    L extends Left.Suffix<{
        root: NumberTypedKeyword
    }>,
    Value extends bigint,
    NextSuffix extends Scanner.Suffix
> = Value extends 0n
    ? Left.Error<ModuloByZeroMessage>
    : Left.SuffixFrom<{
          lowerBound: L["lowerBound"]
          root: [L["root"], ":", [["%", BigintToNumber<Value>]]]
          nextSuffix: NextSuffix
      }>

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
        throwParseError(moduloByZeroMessage)
    }
    return value
}

export const moduloByZeroMessage =
    "Zero is not valid as the right-hand side of a modulo expression"

export type ModuloByZeroMessage = typeof moduloByZeroMessage

const untilPostModuloSuffix: scanner.UntilCondition = (scanner) =>
    scanner.lookahead === "?" || scanner.lookaheadIsIn(comparatorChars)

type IndivisibleMessage<Root extends string> =
    `Modulo operator must be applied to a number-typed keyword (got '${Root}').`

export const indivisibleMessage = <Root extends string>(
    root: Root
): IndivisibleMessage<Root> =>
    `Modulo operator must be applied to a number-typed keyword (got '${root}').`
