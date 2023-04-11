import { throwInternalError } from "../../../../utils/errors.js"
import type { error } from "../../../../utils/generics.js"
import { isKeyOf } from "../../../../utils/generics.js"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import { Scanner } from "../scanner.js"
import type { ComparatorStartChar } from "./bounds.js"
import { comparatorStartChars, parseBound } from "./bounds.js"
import { parseDivisor } from "./divisor.js"

// @snipStart:parseOperator
export const parseOperator = (s: DynamicStateWithRoot): void => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? s.finalize()
        : lookahead === "["
        ? s.scanner.shift() === "]"
            ? s.setRoot(s.root.toArray())
            : s.error(incompleteArrayTokenMessage)
        : isKeyOf(lookahead, Scanner.branchTokens)
        ? s.pushRootToBranch(lookahead)
        : lookahead === ")"
        ? s.finalizeGroup()
        : isKeyOf(lookahead, comparatorStartChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : throwInternalError(writeUnexpectedCharacterMessage(lookahead))
}

export type parseOperator<s extends StaticState> =
    s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "["
            ? unscanned extends Scanner.shift<"]", infer nextUnscanned>
                ? state.setRoot<s, [s["root"], "[]"], nextUnscanned>
                : error<incompleteArrayTokenMessage>
            : lookahead extends Scanner.BranchToken
            ? state.reduceBranch<s, lookahead, unscanned>
            : lookahead extends ")"
            ? state.finalizeGroup<s, unscanned>
            : lookahead extends ComparatorStartChar
            ? parseBound<s, lookahead, unscanned>
            : lookahead extends "%"
            ? parseDivisor<s, unscanned>
            : lookahead extends " "
            ? parseOperator<state.scanTo<s, unscanned>>
            : error<writeUnexpectedCharacterMessage<lookahead>>
        : state.finalize<s>
// @snipEnd

export const writeUnexpectedCharacterMessage = <char extends string>(
    char: char
): writeUnexpectedCharacterMessage<char> => `Unexpected character '${char}'`

type writeUnexpectedCharacterMessage<char extends string> =
    `Unexpected character '${char}'`

export const incompleteArrayTokenMessage = `Missing expected ']'`

type incompleteArrayTokenMessage = typeof incompleteArrayTokenMessage
