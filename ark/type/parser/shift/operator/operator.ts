import { isKeyOf, whitespaceChars, type WhitespaceChar } from "@ark/util"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.ts"
import type { StaticState, state } from "../../reduce/static.ts"
import { ArkTypeScanner } from "../scanner.ts"
import {
	comparatorStartChars,
	parseBound,
	type ComparatorStartChar
} from "./bounds.ts"
import { parseBrand } from "./brand.ts"
import { parseDivisor } from "./divisor.ts"

export const parseOperator = (s: DynamicStateWithRoot): void => {
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
		: ArkTypeScanner.lookaheadIsFinalizing(lookahead, s.scanner.unscanned) ?
			s.finalize(lookahead)
		: isKeyOf(lookahead, comparatorStartChars) ? parseBound(s, lookahead)
		: lookahead === "%" ? parseDivisor(s)
		: lookahead === "#" ? parseBrand(s)
		: lookahead in whitespaceChars ? parseOperator(s)
		: s.error(writeUnexpectedCharacterMessage(lookahead))
	)
}

export type parseOperator<s extends StaticState, $, args> =
	s["unscanned"] extends (
		ArkTypeScanner.shift<infer lookahead, infer unscanned>
	) ?
		lookahead extends "[" ?
			unscanned extends ArkTypeScanner.shift<"]", infer nextUnscanned> ?
				state.setRoot<s, [s["root"], "[]"], nextUnscanned>
			:	state.error<incompleteArrayTokenMessage>
		: lookahead extends "|" ?
			unscanned extends ArkTypeScanner.shift<">", infer nextUnscanned> ?
				state.reduceBranch<s, "|>", nextUnscanned>
			:	state.reduceBranch<s, lookahead, unscanned>
		: lookahead extends "&" ? state.reduceBranch<s, lookahead, unscanned>
		: lookahead extends ")" ? state.finalizeGroup<s, unscanned>
		: ArkTypeScanner.lookaheadIsFinalizing<lookahead, unscanned> extends true ?
			state.finalize<
				state.scanTo<s, unscanned>,
				lookahead & ArkTypeScanner.FinalizingLookahead
			>
		: lookahead extends ComparatorStartChar ?
			parseBound<s, lookahead, unscanned, $, args>
		: lookahead extends "%" ? parseDivisor<s, unscanned>
		: lookahead extends "#" ? parseBrand<s, unscanned>
		: lookahead extends WhitespaceChar ?
			parseOperator<state.scanTo<s, unscanned>, $, args>
		:	state.error<writeUnexpectedCharacterMessage<lookahead>>
	:	state.finalize<s, "">

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
