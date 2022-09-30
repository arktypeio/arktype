import { isKeyOf } from "@re-/tools"
import type { Bound } from "../../../../nodes/nonTerminal/binary/bound.js"
import type { NumberLiteralDefinition } from "../../../../nodes/terminal/literal.js"
import { LiteralNode } from "../../../../nodes/terminal/literal.js"
import type { Scanner } from "../../state/scanner.js"
import type { ParserState, parserState } from "../../state/state.js"
import { ComparatorTokens } from "./tokens.js"

export namespace ComparatorOperator {
    export const parse = (
        s: parserState.withPreconditionRoot,
        start: ComparatorTokens.StartChar
    ) => reduce(s, shift(s, start))

    const shift = (
        s: parserState.withPreconditionRoot,
        start: ComparatorTokens.StartChar
    ): Bound.Token =>
        s.r.lookaheadIs("=")
            ? `${start}${s.r.shift()}`
            : isKeyOf(start, ComparatorTokens.oneChar)
            ? start
            : s.error(singleEqualsMessage)

    export type Parse<
        S extends ParserState,
        Start extends ComparatorTokens.StartChar,
        Unscanned extends string
    > = Unscanned extends Scanner.Shift<"=", infer NextUnscanned>
        ? DelegateReduction<S, `${Start}=`, NextUnscanned>
        : Start extends ComparatorTokens.OneChar
        ? DelegateReduction<S, Start, Unscanned>
        : ParserState.Error<SingleEqualsMessage>

    export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type SingleEqualsMessage = typeof singleEqualsMessage

    const reduce = (
        s: parserState.withPreconditionRoot,
        comparator: Bound.Token
    ) =>
        s.hasRoot(LiteralNode) && typeof s.l.root.value === "number"
            ? reduceLeft(s, comparator)
            : parseRightBound(s, comparator)

    type DelegateReduction<
        S extends ParserState,
        Token extends Bound.Token,
        Unscanned extends string
    > = S["L"]["root"] extends NumberLiteralDefinition<infer Value>
        ? ParserState.From<{
              L: ReduceLeft<S["L"], Value, Token>
              R: Unscanned
          }>
        : ParseRightBound<{ L: S["L"]; R: Unscanned }, Token>
}
