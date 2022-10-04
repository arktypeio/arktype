import { isKeyOf } from "@re-/tools"
import type { Bound } from "../../../../nodes/expression/bound.js"
import { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import type { Scanner } from "../../state/scanner.js"
import { parserState } from "../../state/state.js"
import type { ParserState } from "../../state/state.js"
import { LeftBoundOperator } from "./left.js"
import { RightBoundOperator } from "./right.js"
import { Comparators } from "./tokens.js"

export namespace BoundOperator {
    const shift = (
        s: parserState.WithRoot,
        start: Comparators.StartChar
    ): Bound.Token =>
        s.scanner.lookaheadIs("=")
            ? `${start}${s.scanner.shift()}`
            : isKeyOf(start, Comparators.oneChar)
            ? start
            : parserState.error(singleEqualsMessage)

    export const parse = (
        s: parserState.WithRoot,
        start: Comparators.StartChar
    ) => delegateReduction(s, shift(s, start))

    export type parse<
        s extends ParserState.WithRoot,
        start extends Comparators.StartChar,
        unscanned extends string
    > = unscanned extends Scanner.shift<"=", infer nextUnscanned>
        ? DelegateReduction<s, `${start}=`, nextUnscanned>
        : start extends Comparators.OneChar
        ? DelegateReduction<s, start, unscanned>
        : ParserState.error<singleEqualsMessage>

    export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type singleEqualsMessage = typeof singleEqualsMessage

    const delegateReduction = (
        s: parserState.WithRoot,
        comparator: Bound.Token
    ) =>
        parserState.hasRoot(s, PrimitiveLiteral.Node) &&
        typeof s.root.value === "number"
            ? LeftBoundOperator.reduce(s, comparator)
            : RightBoundOperator.parse(s, comparator)

    type DelegateReduction<
        s extends ParserState.WithRoot,
        comparator extends Bound.Token,
        unscanned extends string
    > = s extends {
        root: PrimitiveLiteral.Number
    }
        ? LeftBoundOperator.reduce<ParserState.scanTo<s, unscanned>, comparator>
        : RightBoundOperator.parse<ParserState.scanTo<s, unscanned>, comparator>
}
