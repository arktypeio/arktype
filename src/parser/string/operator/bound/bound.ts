import { isKeyOf } from "../../../../utils/generics.js"
import { Scanner } from "../../state/scanner.js"
import type { StaticState } from "../../state/state.js"
import { DynamicState } from "../../state/state.js"
import { LeftBoundOperator } from "./left.js"
import { RightBoundOperator } from "./right.js"

export namespace BoundOperator {
    const shift = (
        s: DynamicState.WithRoot,
        start: Scanner.ComparatorStartChar
    ): Scanner.Comparator =>
        s.scanner.lookaheadIs("=")
            ? `${start}${s.scanner.shift()}`
            : isKeyOf(start, Scanner.oneCharComparators)
            ? start
            : DynamicState.error(singleEqualsMessage)

    export const parse = (
        s: DynamicState.WithRoot,
        start: Scanner.ComparatorStartChar
    ) => delegateReduction(s, shift(s, start))

    export type parse<
        s extends StaticState.WithRoot,
        start extends Scanner.ComparatorStartChar,
        unscanned extends string
    > = unscanned extends Scanner.shift<"=", infer nextUnscanned>
        ? delegateReduction<StaticState.scanTo<s, nextUnscanned>, `${start}=`>
        : start extends Scanner.OneCharComparator
        ? delegateReduction<StaticState.scanTo<s, unscanned>, start>
        : StaticState.error<singleEqualsMessage>

    export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type singleEqualsMessage = typeof singleEqualsMessage

    const delegateReduction = (
        s: DynamicState.WithRoot,
        comparator: Scanner.Comparator
    ) =>
        DynamicState.rootAttributeHasType(s, "value", "number")
            ? LeftBoundOperator.parse(s, comparator)
            : RightBoundOperator.parse(s, comparator)

    type delegateReduction<
        s extends StaticState.WithRoot,
        comparator extends Scanner.Comparator
    > = s extends {
        root: number
    }
        ? LeftBoundOperator.parse<s, comparator>
        : RightBoundOperator.parse<s, comparator>
}
