import { isKeyOf } from "../../../../utils/generics.js"
import { Scanner } from "../../state/scanner.js"
import { ParserState } from "../../state/state.js"
import { LeftBoundOperator } from "./left.js"
import { RightBoundOperator } from "./right.js"

export namespace BoundOperator {
    const shift = (
        s: ParserState.WithRoot,
        start: Scanner.ComparatorStartChar
    ): Scanner.Comparator =>
        s.scanner.lookaheadIs("=")
            ? `${start}${s.scanner.shift()}`
            : isKeyOf(start, Scanner.oneCharComparators)
            ? start
            : ParserState.error(singleEqualsMessage)

    export const parse = (
        s: ParserState.WithRoot,
        start: Scanner.ComparatorStartChar
    ) => delegateReduction(s, shift(s, start))

    export type parse<
        s extends ParserState.T.WithRoot,
        start extends Scanner.ComparatorStartChar,
        unscanned extends string
    > = unscanned extends Scanner.shift<"=", infer nextUnscanned>
        ? delegateReduction<ParserState.scanTo<s, nextUnscanned>, `${start}=`>
        : start extends Scanner.OneCharComparator
        ? delegateReduction<ParserState.scanTo<s, unscanned>, start>
        : ParserState.error<singleEqualsMessage>

    export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type singleEqualsMessage = typeof singleEqualsMessage

    const delegateReduction = (
        s: ParserState.WithRoot,
        comparator: Scanner.Comparator
    ) =>
        ParserState.hasRootAttributeType(s, "value", "number")
            ? LeftBoundOperator.reduce(s, comparator)
            : RightBoundOperator.parse(s, comparator)

    type delegateReduction<
        s extends ParserState.T.WithRoot,
        comparator extends Scanner.Comparator
    > = s extends {
        root: number
    }
        ? LeftBoundOperator.reduce<s, comparator>
        : RightBoundOperator.parse<s, comparator>
}
