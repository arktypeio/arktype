import {
    NumberLiteralDefinition,
    numberLiteralNode
} from "../../operand/unenclosed/numberLiteral.js"
import {
    Comparator,
    ComparatorChar,
    Parser,
    SingleCharComparator,
    singleCharComparator
} from "./common.js"
import { ReduceLeft, reduceLeft } from "./left.js"

export const parse = (s: Parser.state.withRoot, start: ComparatorChar) =>
    s.r.lookahead === "="
        ? reduce(s.shifted(), `${start}=`)
        : Parser.inTokenSet(start, singleCharComparator)
        ? reduce(s, start)
        : s.error(singleEqualsMessage)

export type Parse<
    S extends Parser.State,
    Start extends ComparatorChar,
    Unscanned extends string
> = Unscanned extends Parser.Scanner.Shift<"=", infer Rest>
    ? Parser.State.From<{ L: Reduce<S["L"], `${Start}=`>; R: Rest }>
    : Start extends SingleCharComparator
    ? Parser.State.From<{ L: Reduce<S["L"], Start>; R: Unscanned }>
    : Parser.State.Error<SingleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
type SingleEqualsMessage = typeof singleEqualsMessage

export const reduce = (s: Parser.state.withRoot, token: Comparator) =>
    s.hasRoot(numberLiteralNode) ? reduceLeft(s, token) : s.suffixed(token)

export type Reduce<
    L extends Parser.Left,
    Token extends Comparator
> = L extends { root: NumberLiteralDefinition<infer Value> }
    ? ReduceLeft<L, Value, Token>
    : Parser.Left.SetNextSuffix<L, Token>
