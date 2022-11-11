import { isKeyOf } from "../../utils/generics.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import type { DynamicState } from "../state/dynamic.js"
import { Scanner } from "../state/scanner.js"
import type { state, StaticWithRoot } from "../state/static.js"
import { parseArray } from "./array.js"
import { parseBound } from "./bounds/parse.js"
import { parseDivisor } from "./divisor.js"

export const parseOperator = (s: DynamicState): void => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? s.finalize()
        : lookahead === "["
        ? parseArray(s)
        : isKeyOf(lookahead, Scanner.branchTokens)
        ? s.pushBranch(lookahead)
        : lookahead === ")"
        ? s.finalizeGroup()
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
            : lookahead extends Scanner.BranchToken
            ? state.reduceBranch<s, lookahead, unscanned>
            : lookahead extends ")"
            ? state.finalizeGroup<s, unscanned>
            : lookahead extends Scanner.ComparatorStartChar
            ? parseBound<s, lookahead, unscanned>
            : lookahead extends "%"
            ? parseDivisor<s, unscanned>
            : lookahead extends " "
            ? parseOperator<state.scanTo<s, unscanned>>
            : state.error<buildUnexpectedCharacterMessage<lookahead>>
        : state.finalize<s, 0>

export const buildUnexpectedCharacterMessage = <char extends string>(
    char: char
): buildUnexpectedCharacterMessage<char> => `Unexpected character '${char}'`

type buildUnexpectedCharacterMessage<char extends string> =
    `Unexpected character '${char}'`
