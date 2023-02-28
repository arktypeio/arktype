import { throwInternalError } from "../../../../utils/errors.ts"
import type { error } from "../../../../utils/generics.ts"
import { isKeyOf } from "../../../../utils/generics.ts"
import type { DynamicState } from "../../reduce/dynamic.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import { Scanner } from "../scanner.ts"
import { parseBound } from "./bounds.ts"
import { parseDivisor } from "./divisor.ts"

// @snipStart:parseOperator
export const parseOperator = (s: DynamicState): void => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? s.finalize()
        : lookahead === "["
        ? s.scanner.shift() === "]"
            ? s.rootToArray()
            : s.error(incompleteArrayTokenMessage)
        : isKeyOf(lookahead, Scanner.branchTokens)
        ? s.pushRootToBranch(lookahead)
        : lookahead === ")"
        ? s.finalizeGroup()
        : isKeyOf(lookahead, Scanner.comparatorStartChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : /* c8 ignore next */
          throwInternalError(writeUnexpectedCharacterMessage(lookahead))
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
            : lookahead extends Scanner.ComparatorStartChar
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
