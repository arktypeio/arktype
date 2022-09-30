import { isKeyOf } from "@re-/tools"
import type { parserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"
import { parseArray } from "./array.js"
import type { ParseArray } from "./array.js"
import { ComparatorOperator } from "./bound/comparator.js"
import { ComparatorTokens } from "./bound/tokens.js"
import type { ReduceGroupClose } from "./groupClose.js"
import { reduceGroupClose } from "./groupClose.js"
import type { ReduceIntersection } from "./intersection.js"
import { reduceIntersection } from "./intersection.js"
import { ModuloOperator } from "./modulo.js"
import type { FinalizeOptional } from "./optional.js"
import { finalizeOptional } from "./optional.js"
import { reduceUnion } from "./union.js"
import type { ReduceUnion } from "./union.js"

export namespace Operator {
    export const parse = (s: parserState.withPreconditionRoot): parserState => {
        const lookahead = s.r.shift()
        return lookahead === "END"
            ? parserState.finalize(s, false)
            : lookahead === "?"
            ? finalizeOptional(s)
            : lookahead === "["
            ? parseArray(s, ctx)
            : lookahead === "|"
            ? reduceUnion(s)
            : lookahead === "&"
            ? reduceIntersection(s, ctx)
            : lookahead === ")"
            ? reduceGroupClose(s)
            : isKeyOf(lookahead, ComparatorTokens.startChar)
            ? ComparatorOperator.parse(s, lookahead)
            : lookahead === "%"
            ? ModuloOperator.parse(s)
            : lookahead === " "
            ? parse(s)
            : s.error(unexpectedCharacterMessage(lookahead))
    }

    export type Parse<S extends ParserState> = S["R"] extends Scanner.Shift<
        infer Lookahead,
        infer Unscanned
    >
        ? Lookahead extends "?"
            ? FinalizeOptional<S>
            : Lookahead extends "["
            ? ParseArray<S, Unscanned>
            : Lookahead extends "|"
            ? ParserState.From<{
                  L: ReduceUnion<S["L"], Unscanned>
                  R: Unscanned
              }>
            : Lookahead extends "&"
            ? ParserState.From<{
                  L: ReduceIntersection<S["L"], Unscanned>
                  R: Unscanned
              }>
            : Lookahead extends ")"
            ? ParserState.From<{
                  L: ReduceGroupClose<S["L"], Unscanned>
                  R: Unscanned
              }>
            : Lookahead extends ComparatorTokens.StartChar
            ? ComparatorOperator.Parse<S, Lookahead, Unscanned>
            : Lookahead extends "%"
            ? ModuloOperator.Parse<S, Unscanned>
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
