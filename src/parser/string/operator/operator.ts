import { isKeyOf } from "../../../utils/generics.js"
import { throwInternalError } from "../../../utils/internalArktypeError.js"
import { Scanner } from "../state/scanner.js"
import { DynamicState } from "../state/state.js"
import type { StaticState } from "../state/state.js"
import { ArrayOperator } from "./array.js"
import { BoundOperator } from "./bound/bound.js"
import { DivisibilityOperator } from "./divisibility.js"
import { GroupClose } from "./groupClose.js"
import { IntersectionOperator } from "./intersection.js"
import { OptionalOperator } from "./optional.js"
import { UnionOperator } from "./union.js"

export namespace Operator {
    export const parse = (s: DynamicState.WithRoot): DynamicState => {
        const lookahead = s.scanner.shift()
        return lookahead === ""
            ? DynamicState.finalize(s)
            : lookahead === "?"
            ? OptionalOperator.finalize(s)
            : lookahead === "["
            ? ArrayOperator.parse(s)
            : lookahead === "|"
            ? UnionOperator.parse(s)
            : lookahead === "&"
            ? IntersectionOperator.parse(s)
            : lookahead === ")"
            ? GroupClose.parse(s)
            : isKeyOf(lookahead, Scanner.comparatorStartChars)
            ? BoundOperator.parse(s, lookahead)
            : lookahead === "%"
            ? DivisibilityOperator.parse(s)
            : lookahead === " "
            ? parse(s)
            : throwInternalError(buildUnexpectedCharacterMessage(lookahead))
    }

    export type parse<s extends StaticState.WithRoot> =
        s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
            ? lookahead extends "?"
                ? OptionalOperator.finalize<s>
                : lookahead extends "["
                ? ArrayOperator.parse<s, unscanned>
                : lookahead extends "|"
                ? UnionOperator.parse<StaticState.scanTo<s, unscanned>>
                : lookahead extends "&"
                ? IntersectionOperator.parse<StaticState.scanTo<s, unscanned>>
                : lookahead extends ")"
                ? GroupClose.parse<StaticState.scanTo<s, unscanned>>
                : lookahead extends Scanner.ComparatorStartChar
                ? BoundOperator.parse<s, lookahead, unscanned>
                : lookahead extends "%"
                ? DivisibilityOperator.parse<s, unscanned>
                : lookahead extends " "
                ? parse<StaticState.scanTo<s, unscanned>>
                : StaticState.error<buildUnexpectedCharacterMessage<lookahead>>
            : StaticState.finalize<s, 0>

    export const buildUnexpectedCharacterMessage = <char extends string>(
        char: char
    ): buildUnexpectedCharacterMessage<char> =>
        `Unexpected character '${char}'.`

    type buildUnexpectedCharacterMessage<char extends string> =
        `Unexpected character '${char}'.`
}
