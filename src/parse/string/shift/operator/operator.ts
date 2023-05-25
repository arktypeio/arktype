import { isKeyOf } from "../../../../utils/records.js"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.js"
import type { state, StateFinalizer, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"
import type { ComparatorStartChar } from "./bounds.js"
import { comparatorStartChars, parseBound } from "./bounds.js"
import { parseDivisor } from "./divisor.js"

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
                : state.error<incompleteArrayTokenMessage>
            : lookahead extends "|" | "&"
            ? state.reduceBranch<s, lookahead, unscanned>
            : lookahead extends ")"
            ? state.finalizeGroup<s, unscanned>
            : // ensure the initial > is not treated as a finalizer in an expression like Set<number>5> or Set<number>=5>
            // also ensures we still give correct error messages for invalid expressions like 3>number<5
            [lookahead, Scanner.skipWhitespace<unscanned>] extends
                  | [
                        ">",
                        // if the > is actually part of a bound, the next token should be an operand, not an operator
                        "" | `${"=" | ""}${Scanner.OperatorToken}${string}`
                    ]
                  | [",", unknown]
            ? state.finalize<
                  state.scanTo<s, unscanned>,
                  lookahead & StateFinalizer
              >
            : lookahead extends ComparatorStartChar
            ? parseBound<s, lookahead, unscanned>
            : lookahead extends "%"
            ? parseDivisor<s, unscanned>
            : lookahead extends Scanner.WhiteSpaceToken
            ? parseOperator<state.scanTo<s, unscanned>>
            : state.error<writeUnexpectedCharacterMessage<lookahead>>
        : state.finalize<s, "">

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
