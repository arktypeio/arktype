import { isKeyOf } from "@re-/tools"
import type { Scanner } from "../state/scanner.js"
import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"
import { ArrayOperator } from "./array.js"
import { BoundOperator } from "./bound/bound.js"
import { Comparators } from "./bound/tokens.js"
import { DivisibilityOperator } from "./divisibility.js"
import { GroupClose } from "./groupClose.js"
import { IntersectionOperator } from "./intersection.js"
import { OptionalOperator } from "./optional.js"
import { UnionOperator } from "./union.js"

export namespace Operator {
    export const parse = (s: parserState.requireRoot): parserState => {
        const lookahead = s.r.shift()
        return lookahead === "END"
            ? parserState.finalize(s, false)
            : lookahead === "?"
            ? OptionalOperator.finalize(s)
            : lookahead === "["
            ? ArrayOperator.parse(s)
            : lookahead === "|"
            ? UnionOperator.reduce(s)
            : lookahead === "&"
            ? IntersectionOperator.reduce(s)
            : lookahead === ")"
            ? GroupClose.reduce(s)
            : isKeyOf(lookahead, Comparators.startChar)
            ? BoundOperator.parse(s, lookahead)
            : lookahead === "%"
            ? DivisibilityOperator.parse(s)
            : lookahead === " "
            ? parse(s)
            : s.error(unexpectedCharacterMessage(lookahead))
    }

    export type Parse<S extends ParserState<{ root: {} }>> =
        S["R"] extends Scanner.Shift<infer Lookahead, infer Unscanned>
            ? Lookahead extends "?"
                ? OptionalOperator.Finalize<S>
                : Lookahead extends "["
                ? ArrayOperator.Parse<S, Unscanned>
                : Lookahead extends "|"
                ? ParserState.From<{
                      L: UnionOperator.Reduce<S["L"], Unscanned>
                      R: Unscanned
                  }>
                : Lookahead extends "&"
                ? ParserState.From<{
                      L: IntersectionOperator.Reduce<S["L"], Unscanned>
                      R: Unscanned
                  }>
                : Lookahead extends ")"
                ? GroupClose.Reduce<S>
                : Lookahead extends Comparators.StartChar
                ? BoundOperator.Parse<S, Lookahead, Unscanned>
                : Lookahead extends "%"
                ? DivisibilityOperator.Parse<S, Unscanned>
                : Lookahead extends " "
                ? Parse<{ L: S["L"]; R: Unscanned }>
                : ParserState.Error<UnexpectedCharacterMessage<Lookahead>>
            : ParserState.Finalize<S, false>

    const unexpectedCharacterMessage = <Char extends string>(
        char: Char
    ): UnexpectedCharacterMessage<Char> => `Unexpected character '${char}'.`

    type UnexpectedCharacterMessage<Char extends string> =
        `Unexpected character '${Char}'.`
}
