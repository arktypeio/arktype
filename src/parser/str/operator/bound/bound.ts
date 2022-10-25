import type { Bound } from "../../../../nodes/expression/infix/bound.js"
import { NumberLiteral } from "../../../../nodes/terminal/literal/number.js"
import { isKeyOf } from "../../../../utils/generics.js"
import type { Scanner } from "../../state/scanner.js"
import { ParserState } from "../../state/state.js"
import { LeftBoundOperator } from "./left.js"
import { RightBoundOperator } from "./right.js"
import { Comparator } from "./tokens.js"

export namespace BoundOperator {
    const shift = (
        s: ParserState.WithRoot,
        start: Comparator.StartChar
    ): Bound.Token =>
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
        comparator: Bound.Token
    ) =>
        ParserState.rooted(s, NumberLiteral.Node) &&
        typeof s.root.value === "number"
            ? LeftBoundOperator.reduce(s, comparator)
            : RightBoundOperator.parse(s, comparator)

    type delegateReduction<
        s extends ParserState.T.WithRoot,
        comparator extends Bound.Token
    > = s extends {
        root: NumberLiteral.Definition
    }
        ? LeftBoundOperator.reduce<s, comparator>
        : RightBoundOperator.parse<s, comparator>
}
