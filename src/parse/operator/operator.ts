import { isKeyOf } from "../../utils/generics.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import { Scanner } from "../state/scanner.js"
import type {
    DynamicState,
    DynamicWithRoot,
    errorState,
    scanStateTo,
    StaticWithRoot
} from "../state/state.js"
import { finalizeState } from "../state/state.js"
import { parseArray } from "./array.js"
import { parseBound } from "./bounds/parse.js"
import { parseDivisor } from "./divisor.js"
import { parseGroupClose } from "./groupClose.js"
import { parseIntersection } from "./intersection/parse.js"
import { parseUnion } from "./union/parse.js"

export const parseOperator = (s: DynamicWithRoot): DynamicState => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? finalizeState(s)
        : lookahead === "["
        ? parseArray(s)
        : lookahead === "|"
        ? parseUnion(s)
        : lookahead === "&"
        ? parseIntersection(s)
        : lookahead === ")"
        ? parseGroupClose(s)
        : isKeyOf(lookahead, Scanner.comparatorStartChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : throwInternalError(buildUnexpectedCharacterMessage(lookahead))
}

export type parseOperator<s extends StaticWithRoot> =
    s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "["
            ? parseArray<s, unscanned>
            : lookahead extends "|"
            ? parseUnion<scanStateTo<s, unscanned>>
            : lookahead extends "&"
            ? parseIntersection<scanStateTo<s, unscanned>>
            : lookahead extends ")"
            ? parseGroupClose<scanStateTo<s, unscanned>>
            : lookahead extends Scanner.ComparatorStartChar
            ? parseBound<s, lookahead, unscanned>
            : lookahead extends "%"
            ? parseDivisor<s, unscanned>
            : lookahead extends " "
            ? parseOperator<scanStateTo<s, unscanned>>
            : errorState<buildUnexpectedCharacterMessage<lookahead>>
        : finalizeState<s, 0>

export const buildUnexpectedCharacterMessage = <char extends string>(
    char: char
): buildUnexpectedCharacterMessage<char> => `Unexpected character '${char}'`

type buildUnexpectedCharacterMessage<char extends string> =
    `Unexpected character '${char}'`
