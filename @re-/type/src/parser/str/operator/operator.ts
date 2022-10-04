import { isKeyOf } from "@re-/tools"
import type { Scanner } from "../state/scanner.js"
import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"
import type { ArrayOperator } from "./array.js"
import { arrayOperator } from "./array.js"
import { BoundOperator } from "./bound/bound.js"
import { Comparators } from "./bound/tokens.js"
import type { DivisibilityOperator } from "./divisibility.js"
import { divisibilityOperator } from "./divisibility.js"
import type { GroupClose } from "./groupClose.js"
import { groupClose } from "./groupClose.js"
import { intersectionOperator } from "./intersection.js"
import type { IntersectionOperator } from "./intersection.js"
import type { OptionalOperator } from "./optional.js"
import { optionalOperator } from "./optional.js"
import type { UnionOperator } from "./union.js"
import { unionOperator } from "./union.js"

export namespace operator {
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
            ? intersectionOperator.reduce(s)
            : lookahead === ")"
            ? groupClose.reduce(s)
            : isKeyOf(lookahead, Comparators.startChar)
            ? BoundOperator.parse(s, lookahead)
            : lookahead === "%"
            ? divisibilityOperator.parse(s)
            : lookahead === " "
            ? parse(s)
            : parserState.error(buildUnexpectedCharacterMessage(lookahead))
    }
}

export namespace Operator {
    export type parse<S extends ParserState.WithRoot> =
        S["unscanned"] extends Scanner.shift<infer Lookahead, infer Unscanned>
            ? Lookahead extends "?"
                ? OptionalOperator.finalize<S>
                : Lookahead extends "["
                ? ArrayOperator.Parse<S, Unscanned>
                : Lookahead extends "|"
                ? UnionOperator.reduce<S, Unscanned>
                : Lookahead extends "&"
                ? IntersectionOperator.reduce<S, Unscanned>
                : Lookahead extends ")"
                ? GroupClose.reduce<S, Unscanned>
                : Lookahead extends Comparators.StartChar
                ? BoundOperator.Parse<S, Lookahead, Unscanned>
                : Lookahead extends "%"
                ? DivisibilityOperator.Parse<S, Unscanned>
                : Lookahead extends " "
                ? parse<ParserState.scanTo<S, Unscanned>>
                : ParserState.error<buildUnexpectedCharacterMessage<Lookahead>>
            : ParserState.finalize<S, 0>
}

export namespace operator {
    export const buildUnexpectedCharacterMessage = <char extends string>(
        char: char
    ): Operator.buildUnexpectedCharacterMessage<char> =>
        `Unexpected character '${char}'.`
}

export namespace Operator {
    export type buildUnexpectedCharacterMessage<char extends string> =
        `Unexpected character '${char}'.`
}
