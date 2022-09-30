import { isKeyOf } from "@re-/tools"
import type { Bound } from "../../../../nodes/nonTerminal/binary/bound.js"
import { PrimitiveLiteral } from "../../../../nodes/terminal/literal.js"
import type { Scanner } from "../../state/scanner.js"
import type { ParserState, parserState } from "../../state/state.js"
import { LeftBoundOperator } from "./left.js"
import { RightBoundOperator } from "./right.js"
import { Comparators } from "./tokens.js"

export namespace BoundOperator {
    export const parse = (
        s: parserState.requireRoot,
        start: Comparators.StartChar
    ) => reduce(s, shift(s, start))

    const shift = (
        s: parserState.requireRoot,
        start: Comparators.StartChar
    ): Bound.Token =>
        s.r.lookaheadIs("=")
            ? `${start}${s.r.shift()}`
            : isKeyOf(start, Comparators.oneChar)
            ? start
            : s.error(singleEqualsMessage)

    export type Parse<
        S extends ParserState,
        Start extends Comparators.StartChar,
        Unscanned extends string
    > = Unscanned extends Scanner.Shift<"=", infer NextUnscanned>
        ? DelegateReduction<S, `${Start}=`, NextUnscanned>
        : Start extends Comparators.OneChar
        ? DelegateReduction<S, Start, Unscanned>
        : ParserState.Error<SingleEqualsMessage>

    export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type SingleEqualsMessage = typeof singleEqualsMessage

    const reduce = (s: parserState.requireRoot, comparator: Bound.Token) =>
        s.hasRoot(PrimitiveLiteral.Node) && typeof s.l.root.value === "number"
            ? LeftBoundOperator.reduce(s, comparator)
            : RightBoundOperator.parse(s, comparator)

    type DelegateReduction<
        S extends ParserState,
        Token extends Bound.Token,
        Unscanned extends string
    > = S extends {
        L: { root: PrimitiveLiteral.Number }
    }
        ? ParserState.From<{
              L: LeftBoundOperator.Reduce<S["L"], Token>
              R: Unscanned
          }>
        : RightBoundOperator.Parse<{ L: S["L"]; R: Unscanned }, Token>
}
