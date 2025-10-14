import {
	isKeyOf,
	whitespaceChars,
	type Scanner,
	type WhitespaceChar
} from "@ark/util"
import type { RootedRuntimeState } from "../../reduce/dynamic.ts"
import type { StaticState, s } from "../../reduce/static.ts"
import { lookaheadIsFinalizing, type FinalizingLookahead } from "../tokens.ts"
import {
	comparatorStartChars,
	parseBound,
	type ComparatorStartChar
} from "./bounds.ts"
import { parseBrand } from "./brand.ts"
import { parseDivisor } from "./divisor.ts"

export const parseOperator = (s: RootedRuntimeState): void => {
	const lookahead = s.scanner.shift()
	return (
		lookahead === "" ? s.finalize("")
		: lookahead === "[" ?
			s.scanner.shift() === "]" ?
				s.setRoot(s.root.array())
			:	s.error(incompleteArrayTokenMessage)
		: lookahead === "|" ?
			s.scanner.lookahead === ">" ?
				s.shiftedByOne().pushRootToBranch("|>")
			:	s.pushRootToBranch(lookahead)
		: lookahead === "&" ? s.pushRootToBranch(lookahead)
		: lookahead === ")" ? s.finalizeGroup()
		: lookaheadIsFinalizing(lookahead, s.scanner.unscanned) ?
			s.finalize(lookahead)
		: isKeyOf(lookahead, comparatorStartChars) ? parseBound(s, lookahead)
		: lookahead === "%" ? parseDivisor(s)
		: lookahead === "#" ? parseBrand(s)
		: lookahead in whitespaceChars ? parseOperator(s)
		: s.error(writeUnexpectedCharacterMessage(lookahead))
	)
}

export type parseOperator<s extends StaticState, $, args> =
	s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends "[" ?
			unscanned extends Scanner.shift<"]", infer nextUnscanned> ?
				s.setRoot<s, [s["root"], "[]"], nextUnscanned>
			:	s.error<incompleteArrayTokenMessage>
		: lookahead extends "|" ?
			unscanned extends Scanner.shift<">", infer nextUnscanned> ?
				s.reduceBranch<s, "|>", nextUnscanned>
			:	s.reduceBranch<s, lookahead, unscanned>
		: lookahead extends "&" ? s.reduceBranch<s, lookahead, unscanned>
		: lookahead extends ")" ? s.finalizeGroup<s, unscanned>
		: lookaheadIsFinalizing<lookahead, unscanned> extends true ?
			s.finalize<s.scanTo<s, unscanned>, lookahead & FinalizingLookahead>
		: lookahead extends ComparatorStartChar ?
			parseBound<s, lookahead, unscanned, $, args>
		: lookahead extends "%" ? parseDivisor<s, unscanned>
		: lookahead extends "#" ? parseBrand<s, unscanned>
		: lookahead extends WhitespaceChar ?
			parseOperator<s.scanTo<s, unscanned>, $, args>
		:	s.error<writeUnexpectedCharacterMessage<lookahead>>
	:	s.finalize<s, "">

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
> = `'${char}' is not allowed here${shouldBe extends "" ? ""
:	` (should be ${shouldBe})`}`

export const incompleteArrayTokenMessage = `Missing expected ']'`

type incompleteArrayTokenMessage = typeof incompleteArrayTokenMessage
