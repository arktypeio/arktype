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
	const peek = s.sc.shift()
	return (
		peek === "" ? s.finalize("")
		: peek === "[" ?
			s.sc.shift() === "]" ?
				s.setRoot(s.root.rawArray())
			:	s.error(incompleteArrayTokenMessage)
		: peek === "|" ?
			s.sc.peek === ">" ?
				s.shiftedBy(1).pushRootBranch("|>")
			:	s.pushRootBranch(peek)
		: peek === "&" ? s.pushRootBranch(peek)
		: peek === ")" ? s.finalizeGroup()
		: lookaheadIsFinalizing(peek, s.sc.unscanned) ? s.finalize(peek)
		: isKeyOf(peek, comparatorStartChars) ? parseBound(s, peek)
		: peek === "%" ? parseDivisor(s)
		: peek === "#" ? parseBrand(s)
		: peek in whitespaceChars ? parseOperator(s)
		: s.error(writeUnexpectedCharacterMessage(peek))
	)
}

export type parseOperator<s extends StaticState, $, args> =
	s["unscanned"] extends Scanner.shift<infer peek, infer unscanned> ?
		peek extends "[" ?
			unscanned extends Scanner.shift<"]", infer nextUnscanned> ?
				s.setRoot<s, [s["root"], "[]"], nextUnscanned>
			:	s.error<incompleteArrayTokenMessage>
		: peek extends "|" ?
			unscanned extends Scanner.shift<">", infer nextUnscanned> ?
				s.reduceBranch<s, "|>", nextUnscanned>
			:	s.reduceBranch<s, peek, unscanned>
		: peek extends "&" ? s.reduceBranch<s, peek, unscanned>
		: peek extends ")" ? s.finalizeGroup<s, unscanned>
		: lookaheadIsFinalizing<peek, unscanned> extends true ?
			s.finalize<s.scanTo<s, unscanned>, peek & FinalizingLookahead>
		: peek extends ComparatorStartChar ? parseBound<s, peek, unscanned, $, args>
		: peek extends "%" ? parseDivisor<s, unscanned>
		: peek extends "#" ? parseBrand<s, unscanned>
		: peek extends WhitespaceChar ?
			parseOperator<s.scanTo<s, unscanned>, $, args>
		:	s.error<writeUnexpectedCharacterMessage<peek>>
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
