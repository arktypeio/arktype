/**
 * Modulo should be similar in terms of complexity to the adjacent "list.ts"
 * file. The main difference is that instead of creating a new node and setting
 * the root to be that node, we are:
 *
 * 1. Validating that the existing root node is a numberNode (should use the state.hasRoot typeguard)
 * 2. After encountering the modulo token, we need to parse the next operand and validate that it is a number.
 * Once we do that, we will use it to create a moduloConstraint:
 *
 * const moduloValue = s.r.shiftUntil(untilNextSuffix)
 *
 * 3. Setting the "modulo" property of that node to be a new instance of moduloConstraint
 */

import { Base } from "../../nodes/base.js"
import { AddConstraints } from "../../nodes/constraints/common.js"
import { modulo } from "../../nodes/types/nonTerminal/expression/unary/modulo.js"
import { NumberLiteralDefinition } from "../operand/unenclosed.js"
import {
    OneCharSuffixToken,
    SuffixToken,
    suffixTokens,
    TwoCharSuffixToken,
    UnexpectedSuffixMessage
} from "../parser/common.js"
import { left, Left } from "../parser/left.js"
import { parserState, ParserState } from "../parser/state.js"

// "number%10<100"
// S["R"] == "10<100"

// "number%10<=100"
// S["R"] == "10<=100"
// S["R"] == "=100"

export type ParseModulo<S extends ParserState.Of<Left.Suffix>> =
    S["R"] extends ModuloValueFollowedByTwoCharSuffix<
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
        : S["R"] extends NumberLiteralDefinition<infer Value>
        ? ParserState.From<{
              L: ReduceModulo<S["L"], Value, "END">
              R: ""
          }>
        : ParserState.Error<
              UnexpectedSuffixMessage<"%", S["R"], "a number literal">
          >

type ReduceModulo<
    L extends Left.Suffix,
    Value extends number,
    NextSuffix extends SuffixToken
> = Left.SuffixFrom<{
    lowerBound: L["lowerBound"]
    root: AddConstraints<L["root"], [["%", Value]]>
    nextSuffix: NextSuffix
}>

type ModuloValueFollowedByOneCharSuffix<
    Value extends number,
    NextSuffix extends OneCharSuffixToken,
    Unscanned extends string
> = `${Value}${NextSuffix}${Unscanned}`

type ModuloValueFollowedByTwoCharSuffix<
    Value extends number,
    NextSuffix extends TwoCharSuffixToken,
    Unscanned extends string
> = `${Value}${NextSuffix}${Unscanned}`

export const parseModulo = (s: parserState<left.suffix>, ctx: Base.context) => {
    let val = ""
    if (!parseInt(s.r.lookahead)) {
        throw new Error("Well that's not a number literal.")
    }
    while (parseInt(s.r.lookahead)) {
        val += s.r.lookahead
        s.r.shift()
    }

    s.l.root = new modulo(s.l.root, ctx)
    s.l.nextSuffix = "END"
    return s
}

// const untilNextSuffix: scanner.UntilCondition = (scanner) =>
//     scanner.lookahead ===
