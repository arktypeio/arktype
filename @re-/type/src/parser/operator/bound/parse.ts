import { literalNode } from "../../../nodes/types/terminal/literal.js"
import { NumberLiteralDefinition } from "../../operand/unenclosed.js"
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

export const parseBound = (s: parserState.withRoot, start: ComparatorChar) =>
    s.r.lookahead === "="
        ? reduceBound(s.shifted(), `${start}=`)
        : scanner.inTokenSet(start, singleCharComparator)
        ? reduceBound(s, start)
        : s.error(singleEqualsMessage)

export type ParseBound<
    S extends ParserState,
    Start extends ComparatorChar,
    Unscanned extends string
> = Unscanned extends Scanner.Shift<"=", infer Rest>
    ? ParserState.From<{ L: ReduceBound<S["L"], `${Start}=`>; R: Rest }>
    : Start extends SingleCharComparator
    ? ParserState.From<{ L: ReduceBound<S["L"], Start>; R: Unscanned }>
    : ParserState.Error<SingleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
type SingleEqualsMessage = typeof singleEqualsMessage

export const reduceBound = (s: parserState.withRoot, token: Comparator) =>
    s.hasRoot(literalNode) && typeof s.l.root.value === "number"
        ? reduceLeft(s, token)
        : s.suffixed(token)

export type ReduceBound<L extends Left, Token extends Comparator> = L extends {
    root: NumberLiteralDefinition<infer Value>
}
    ? ReduceLeft<L, Value, Token>
    : Left.SetNextSuffix<L, Token>
