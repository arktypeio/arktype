import { Base } from "../../nodes/base.js"
import { AddConstraints } from "../../nodes/constraints/common.js"
import {
    moduloConstraint,
    NumberKeyword,
    numberNode
} from "../../nodes/types/terminal/keywords/number.js"
import {
    IntegerLiteralDefinition,
    isIntegerLiteral,
    NumberLiteralDefinition
} from "../operand/unenclosed.js"
import {
    NodeToString,
    OneCharSuffixToken,
    SuffixToken,
    TwoCharSuffixToken,
    unexpectedSuffixMessage,
    UnexpectedSuffixMessage
} from "../parser/common.js"
import { left, Left } from "../parser/left.js"
import { scanner } from "../parser/scanner.js"
import { parserState, ParserState } from "../parser/state.js"
import { comparatorChars } from "./bound/common.js"
import { shiftComparator } from "./bound/parse.js"

export type ParseModulo<S extends ParserState.Of<Left.Suffix>> =
    S["L"] extends { root: NumberKeyword }
        ? S["R"] extends ModuloValueFollowedByTwoCharSuffix<
              infer Value,
              TwoCharSuffixToken,
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
                  OneCharSuffixToken,
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
                  UnexpectedSuffixMessage<"%", S["R"], "a number literal">
              >
        : ParserState.Error<IndivisibleMessage<NodeToString<S["L"]["root"]>>>

type ModuloValueFollowedByOneCharSuffix<
    Value extends bigint,
    NextSuffix extends OneCharSuffixToken,
    Unscanned extends string
> = `${Value}${NextSuffix}${Unscanned}`

type ModuloValueFollowedByTwoCharSuffix<
    Value extends bigint,
    NextSuffix extends TwoCharSuffixToken,
    Unscanned extends string
> = `${Value}${NextSuffix}${Unscanned}`

export const parseModulo = (s: parserState<left.suffix>) => {
    const moduloValue = s.r.shiftUntil(untilPostModuloSuffix)
    const nextSuffix = s.r.lookaheadIsIn(comparatorChars)
        ? shiftComparator(s, s.r.shift())
        : (s.r.shift() as "?" | "END")
    return isIntegerLiteral(moduloValue)
        ? s.hasRoot(numberNode)
            ? reduceModulo(
                  s,
                  integerLiteralToDivisorValue(moduloValue),
                  nextSuffix
              )
            : s.error(indivisibleMessage(s.l.root.toString()))
        : s.error(
              unexpectedSuffixMessage(
                  "%",
                  `${moduloValue}${nextSuffix === "END" ? "" : nextSuffix}${
                      s.r.unscanned
                  }`,
                  "an integer literal"
              )
          )
}

const reduceModulo = (
    s: parserState<left.suffix<{ root: numberNode }>>,
    value: number,
    nextSuffix: SuffixToken
) => {
    s.l.root.modulo = new moduloConstraint(value)
    s.l.nextSuffix = nextSuffix
    return s
}

type ReduceModulo<
    L extends Left.Suffix<{
        root: NumberKeyword
    }>,
    Value extends bigint,
    NextSuffix extends SuffixToken
> = Value extends 0n
    ? Left.Error<ModuloByZeroMessage>
    : Left.SuffixFrom<{
          lowerBound: L["lowerBound"]
          root: AddConstraints<L["root"], [["%", BigintToNumber<Value>]]>
          nextSuffix: NextSuffix
      }>

type BigintToNumber<Value extends bigint> =
    `${Value}` extends NumberLiteralDefinition<infer NumericValue>
        ? NumericValue
        : never

const integerLiteralToDivisorValue = (definition: IntegerLiteralDefinition) => {
    const value = parseInt(definition)
    if (Number.isNaN(value)) {
        Base.throwParseError(
            `Unexpectedly failed to parse an integer from '${value}'.`
        )
    }
    if (value === 0) {
        Base.throwParseError(moduloByZeroMessage)
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
