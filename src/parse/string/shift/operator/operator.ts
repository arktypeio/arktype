import { isKeyOf } from "@arktype/utils"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import { Scanner } from "../scanner.js"
import type { ComparatorStartChar } from "./bounds.js"
import { comparatorStartChars, parseBound } from "./bounds.js"
import { parseDivisor } from "./divisor.js"

export const parseOperator = (s: DynamicStateWithRoot): void => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? s.finalize("")
        : lookahead === "["
        ? s.scanner.shift() === "]"
            ? s.setRoot(s.root.array())
            : s.error(incompleteArrayTokenMessage)
        : lookahead === "|" || lookahead === "&"
        ? s.pushRootToBranch(lookahead)
        : lookahead === ")"
        ? s.finalizeGroup()
        : Scanner.lookaheadIsFinalizing(lookahead, s.scanner.unscanned)
        ? s.finalize(lookahead)
        : isKeyOf(lookahead, comparatorStartChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : s.error(writeUnexpectedCharacterMessage(lookahead))
}

export type parseOperator<
    s extends StaticState,
    $,
    args
> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
    ? lookahead extends "["
        ? unscanned extends Scanner.shift<"]", infer nextUnscanned>
            ? state.setRoot<s, [s["root"], "[]"], nextUnscanned>
            : state.error<incompleteArrayTokenMessage>
        : lookahead extends "|" | "&"
        ? state.reduceBranch<s, lookahead, unscanned>
        : lookahead extends ")"
        ? state.finalizeGroup<s, unscanned>
        : Scanner.lookaheadIsFinalizing<lookahead, unscanned> extends true
        ? state.finalize<
              state.scanTo<s, unscanned>,
              lookahead & Scanner.FinalizingLookahead
          >
        : lookahead extends ComparatorStartChar
        ? parseBound<s, lookahead, unscanned, $, args>
        : lookahead extends "%"
        ? parseDivisor<s, unscanned>
        : lookahead extends Scanner.WhiteSpaceToken
        ? parseOperator<state.scanTo<s, unscanned>, $, args>
        : state.error<writeUnexpectedCharacterMessage<lookahead>>
    : state.finalize<s, "">

export const writeUnexpectedCharacterMessage = <
    char extends string,
    shouldBe extends string
>(
    char: char,
    shouldBe: shouldBe = "" as shouldBe
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
