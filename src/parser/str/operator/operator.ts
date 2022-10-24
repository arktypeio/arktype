import { isKeyOf } from "../../../utils/generics.js"
import { throwInternalError } from "../../../utils/internalArktypeError.js"
import type { Scanner } from "../state/scanner.js"
import { ParserState } from "../state/state.js"
import { ArrayOperator } from "./array.js"
import { BoundOperator } from "./bound/bound.js"
import { Comparators } from "./bound/tokens.js"
import { DivisibilityOperator } from "./divisibility.js"
import { GroupClose } from "./groupClose.js"
import { IntersectionOperator } from "./intersection.js"
import { OptionalOperator } from "./optional.js"
import { UnionOperator } from "./union.js"

export namespace Operator {
    export const parse = (s: ParserState.WithRoot): ParserState.Base => {
        const lookahead = s.scanner.shift()
        return lookahead === ""
            ? ParserState.finalize(s)
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
            : throwInternalError(buildUnexpectedCharacterMessage(lookahead))
    }

    export type parse<s extends ParserState.T.WithRoot> =
        s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
            ? lookahead extends "?"
                ? OptionalOperator.finalize<s>
                : lookahead extends "["
                ? ArrayOperator.parse<s, unscanned>
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
