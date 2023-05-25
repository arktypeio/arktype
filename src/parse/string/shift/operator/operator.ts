import type { error } from "../../../../utils/errors.js"
import type { join } from "../../../../utils/lists.js"
import { isKeyOf } from "../../../../utils/records.js"
import type { stringifyUnion } from "../../../../utils/unionToTuple.js"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"
import type { ComparatorStartChar } from "./bounds.js"
import { comparatorStartChars, parseBound } from "./bounds.js"
import { parseDivisor } from "./divisor.js"

// @snipStart:parseOperator
export const parseOperator = (s: DynamicStateWithRoot): void => {
    const lookahead = s.scanner.shift()
    return lookahead === "["
        ? s.scanner.shift() === "]"
            ? s.setRoot(s.root.array())
            : s.error(incompleteArrayTokenMessage)
        : lookahead === "|" || lookahead === "&"
        ? s.pushRootToBranch(lookahead)
        : lookahead === ")"
        ? s.finalizeGroup()
        : isKeyOf(lookahead, comparatorStartChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : s.error(writeUnexpectedCharacterMessage(lookahead))
}

export type parseOperator<s extends StaticState> =
    s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "["
            ? unscanned extends Scanner.shift<"]", infer nextUnscanned>
                ? state.setRoot<s, [s["root"], "[]"], nextUnscanned>
                : error<incompleteArrayTokenMessage>
            : lookahead extends "|" | "&"
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
        : error<writeUnexpectedCharacterMessage<"">>
// @snipEnd

export const writeUnexpectedCharacterMessage = <
    char extends string,
    shouldBe extends string
>(
    char: char,
    shouldBe?: shouldBe
): writeUnexpectedCharacterMessage<char, shouldBe> =>
    `'${char}' is not allowed here${
        shouldBe && (` (should be ${shouldBe})` as any)
    }`

export type writeUnexpectedCharacterMessage<
    char extends string,
    shouldBe extends string = ""
> = `'${char}' is not allowed here${shouldBe extends ""
    ? ""
    : ` (should be ${shouldBe})`}`

export const incompleteArrayTokenMessage = `Missing expected ']'`

type incompleteArrayTokenMessage = typeof incompleteArrayTokenMessage
