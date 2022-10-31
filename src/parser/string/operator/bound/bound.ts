import { isKeyOf } from "../../../../utils/generics.js"
import { Scanner } from "../../state/scanner.js"
import { State } from "../../state/state.js"
import { LeftBoundOperator } from "./left.js"
import { RightBoundOperator } from "./right.js"

export namespace BoundOperator {
    const shift = (
        s: State.DynamicWithRoot,
        start: Scanner.ComparatorStartChar
    ): Scanner.Comparator =>
        s.scanner.lookaheadIs("=")
            ? `${start}${s.scanner.shift()}`
            : isKeyOf(start, Scanner.oneCharComparators)
            ? start
            : State.error(singleEqualsMessage)

    export const parse = (
        s: State.DynamicWithRoot,
        start: Scanner.ComparatorStartChar
    ) => delegateReduction(s, shift(s, start))

    export type parse<
        s extends State.StaticWithRoot,
        start extends Scanner.ComparatorStartChar,
        unscanned extends string
    > = unscanned extends Scanner.shift<"=", infer nextUnscanned>
        ? delegateReduction<State.scanTo<s, nextUnscanned>, `${start}=`>
        : start extends Scanner.OneCharComparator
        ? delegateReduction<State.scanTo<s, unscanned>, start>
        : State.error<singleEqualsMessage>

    export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type singleEqualsMessage = typeof singleEqualsMessage

    const delegateReduction = (
        s: State.DynamicWithRoot,
        comparator: Scanner.Comparator
    ) =>
        State.rootAttributeHasType(s, "value", "number")
            ? LeftBoundOperator.parse(s, comparator)
            : RightBoundOperator.parse(s, comparator)

    type delegateReduction<
        s extends State.StaticWithRoot,
        comparator extends Scanner.Comparator
    > = s extends {
        root: number
    }
        ? LeftBoundOperator.parse<s, comparator>
        : RightBoundOperator.parse<s, comparator>
}
