import type { emptyBrandNameMessage } from "@ark/schema"
import type { Scanner } from "@ark/util"
import type { RootedRuntimeState } from "../../reduce/dynamic.ts"
import type { StaticState, s } from "../../reduce/static.ts"
import { terminatingChars, type TerminatingChar } from "../tokens.ts"

export const parseBrand = (s: RootedRuntimeState): void => {
	s.scanner.shiftUntilNonWhitespace()
	const brandName = s.scanner.shiftUntilLookahead(terminatingChars)
	s.root = s.root.brand(brandName)
}

export type parseBrand<s extends StaticState, unscanned extends string> =
	Scanner.shiftUntil<
		Scanner.skipWhitespace<unscanned>,
		TerminatingChar
	> extends Scanner.shiftResult<`${infer brandName}`, infer nextUnscanned> ?
		brandName extends "" ?
			s.error<emptyBrandNameMessage>
		:	s.setRoot<s, [s["root"], "#", brandName], nextUnscanned>
	:	never
