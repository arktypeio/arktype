import type { emptyBrandNameMessage } from "@ark/schema"
import type { Scanner } from "@ark/util"
import type { RootedRuntimeState } from "../../reduce/dynamic.ts"
import type { StaticState, s } from "../../reduce/static.ts"
import { shiftUntilTerminator } from "../tokens.ts"

export const parseBrand = (s: RootedRuntimeState): void => {
	s.scanner.skipSpace()
	const brandName = shiftUntilTerminator(s.scanner)
	s.root = s.root.brand(brandName)
}

export type parseBrand<s extends StaticState, unscanned extends string> =
	shiftUntilTerminator<Scanner.skipWhitespace<unscanned>> extends (
		Scanner.shiftResult<`${infer brandName}`, infer nextUnscanned>
	) ?
		brandName extends "" ?
			s.error<emptyBrandNameMessage>
		:	s.setRoot<s, [s["root"], "#", brandName], nextUnscanned>
	:	never
