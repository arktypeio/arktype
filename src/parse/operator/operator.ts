import { isKeyOf } from "../../utils/generics.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import { Scanner } from "../state/scanner.js"
import { State } from "../state/state.js"
import { parseArray } from "./array.js"
import { Bounds } from "./bounds/bound.js"
import { parseDivisor } from "./divisor.js"
import { parseGroupClose } from "./groupClose.js"
import { parseIntersection } from "./intersection/parse.js"
import { parseUnion } from "./union/parse.js"

export const parseOperator = (s: State.DynamicWithRoot): State.Dynamic => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? State.finalize(s)
        : lookahead === "["
        ? parseArray(s)
        : lookahead === "|"
        ? parseUnion(s)
        : lookahead === "&"
        ? parseIntersection(s)
        : lookahead === ")"
        ? parseGroupClose(s)
        : isKeyOf(lookahead, Scanner.comparatorStartChars)
        ? Bounds.parse(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : throwInternalError(buildUnexpectedCharacterMessage(lookahead))
}

export type parseOperator<s extends State.StaticWithRoot> =
    s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "["
            ? parseArray<s, unscanned>
            : lookahead extends "|"
            ? parseUnion<State.scanTo<s, unscanned>>
            : lookahead extends "&"
            ? parseIntersection<State.scanTo<s, unscanned>>
            : lookahead extends ")"
            ? parseGroupClose<State.scanTo<s, unscanned>>
            : lookahead extends Scanner.ComparatorStartChar
            ? Bounds.parse<s, lookahead, unscanned>
            : lookahead extends "%"
            ? parseDivisor<s, unscanned>
            : lookahead extends " "
            ? parseOperator<State.scanTo<s, unscanned>>
            : State.error<buildUnexpectedCharacterMessage<lookahead>>
        : State.finalize<s, 0>

export const buildUnexpectedCharacterMessage = <char extends string>(
    char: char
): buildUnexpectedCharacterMessage<char> => `Unexpected character '${char}'`

type buildUnexpectedCharacterMessage<char extends string> =
    `Unexpected character '${char}'`
