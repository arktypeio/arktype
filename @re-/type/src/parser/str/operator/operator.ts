import { isKeyOf } from "@re-/tools"
import type { Scanner } from "../state/scanner.js"
import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"
import type { ArrayOperator } from "./array.js"
import { arrayOperator } from "./array.js"
import { BoundOperator } from "./bound/bound.js"
import { Comparators } from "./bound/tokens.js"
import { DivisibilityOperator } from "./divisibility.js"
import { GroupClose } from "./groupClose.js"
import { IntersectionOperator } from "./intersection.js"
import type { OptionalOperator } from "./optional.js"
import { optionalOperator } from "./optional.js"
import type { UnionOperator } from "./union.js"
import { unionOperator } from "./union.js"

export namespace operator {}

export namespace Operator {
    export const parse = (s: parserState.WithRoot): parserState => {
        const lookahead = s.scanner.shift()
        return lookahead === "END"
            ? parserState.finalize(s)
            : lookahead === "?"
            ? optionalOperator.finalize(s)
            : lookahead === "["
            ? arrayOperator.parse(s)
            : lookahead === "|"
            ? unionOperator.reduce(s)
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
            : parserState.error(buildUnexpectedCharacterMessage(lookahead))
    }

    export type parse<s extends ParserState.WithRoot> =
        s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
            ? lookahead extends "?"
                ? OptionalOperator.finalize<s>
                : lookahead extends "["
                ? ArrayOperator.Parse<s, unscanned>
                : lookahead extends "|"
                ? UnionOperator.reduce<s, unscanned>
                : lookahead extends "&"
                ? IntersectionOperator.reduce<s, unscanned>
                : lookahead extends ")"
                ? GroupClose.reduce<s, unscanned>
                : lookahead extends Comparators.StartChar
                ? BoundOperator.parse<s, lookahead, unscanned>
                : lookahead extends "%"
                ? DivisibilityOperator.parse<s, unscanned>
                : lookahead extends " "
                ? parse<ParserState.scanTo<s, unscanned>>
                : ParserState.error<buildUnexpectedCharacterMessage<lookahead>>
            : ParserState.finalize<s, 0>

    export const buildUnexpectedCharacterMessage = <char extends string>(
        char: char
    ): buildUnexpectedCharacterMessage<char> =>
        `Unexpected character '${char}'.`

    type buildUnexpectedCharacterMessage<char extends string> =
        `Unexpected character '${char}'.`
}
