import {
    NumberLiteralDefinition,
    numberLiteralNode
} from "../../../nodes/types/terminal/literals/number.js"
import { Left } from "../../parser/left.js"
import { scanner, Scanner } from "../../parser/scanner.js"
import { parserState, ParserState } from "../../parser/state.js"
import {
    Comparator,
    ComparatorChar,
    SingleCharComparator,
    singleCharComparator
} from "./common.js"
import { ReduceLeft, reduceLeft } from "./left.js"

export const parse = (s: parserState.withRoot, start: ComparatorChar) =>
    s.r.lookahead === "="
        ? reduce(s.shifted(), `${start}=`)
        : scanner.inTokenSet(start, singleCharComparator)
        ? reduce(s, start)
        : s.error(singleEqualsMessage)

export type Parse<
    S extends ParserState,
    Start extends ComparatorChar,
    Unscanned extends string
> = Unscanned extends Scanner.Shift<"=", infer Rest>
    ? ParserState.From<{ L: Reduce<S["L"], `${Start}=`>; R: Rest }>
    : Start extends SingleCharComparator
    ? ParserState.From<{ L: Reduce<S["L"], Start>; R: Unscanned }>
    : ParserState.Error<SingleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
type SingleEqualsMessage = typeof singleEqualsMessage

export const reduce = (s: parserState.withRoot, token: Comparator) =>
    s.hasRoot(numberLiteralNode) ? reduceLeft(s, token) : s.suffixed(token)

export type Reduce<L extends Left, Token extends Comparator> = L extends {
    root: NumberLiteralDefinition<infer Value>
}
    ? ReduceLeft<L, Value, Token>
    : Left.SetNextSuffix<L, Token>
