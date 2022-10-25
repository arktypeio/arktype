import { isKeyOf } from "../../../../utils/generics.js"
import type { Scanner } from "../../state/scanner.js"
import { ParserState } from "../../state/state.js"
import { Comparator } from "./comparator.js"
import { LeftBoundOperator } from "./left.js"
import { RightBoundOperator } from "./right.js"

export namespace BoundOperator {
    const shift = (
        s: ParserState.WithRoot,
        start: Comparator.StartChar
    ): Comparator.Token =>
        s.scanner.lookaheadIs("=")
            ? `${start}${s.scanner.shift()}`
            : isKeyOf(start, Comparator.oneCharTokens)
            ? start
            : ParserState.error(singleEqualsMessage)

    export const parse = (
        s: ParserState.WithRoot,
        start: Comparator.StartChar
    ) => delegateReduction(s, shift(s, start))

    export type parse<
        s extends ParserState.T.WithRoot,
        start extends Comparator.StartChar,
        unscanned extends string
    > = unscanned extends Scanner.shift<"=", infer nextUnscanned>
        ? delegateReduction<ParserState.scanTo<s, nextUnscanned>, `${start}=`>
        : start extends Comparator.OneCharToken
        ? delegateReduction<ParserState.scanTo<s, unscanned>, start>
        : ParserState.error<singleEqualsMessage>

    export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type singleEqualsMessage = typeof singleEqualsMessage

    const delegateReduction = (
        s: ParserState.WithRoot,
        comparator: Comparator.Token
    ) =>
        s.root.get("value")
            ? LeftBoundOperator.reduce(s, comparator)
            : RightBoundOperator.parse(s, comparator)

    type delegateReduction<
        s extends ParserState.T.WithRoot,
        comparator extends Comparator.Token
    > = s extends {
        root: {
            value: number
        }
    }
        ? LeftBoundOperator.reduce<s, comparator>
        : RightBoundOperator.parse<s, comparator>
}
