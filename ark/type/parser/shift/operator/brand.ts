import type { emptyBrandNameMessage } from "@ark/schema"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.ts"
import type { StaticState, state } from "../../reduce/static.ts"
import type { Scanner } from "../scanner.ts"

export const parseBrand = (s: DynamicStateWithRoot): void => {
	s.scanner.shiftUntilNonWhitespace()
	const brandName = s.scanner.shiftUntilNextTerminator()
	s.root = s.root.brand(brandName)
}

export type parseBrand<s extends StaticState, unscanned extends string> =
	Scanner.shiftUntilNextTerminator<Scanner.skipWhitespace<unscanned>> extends (
		Scanner.shiftResult<`${infer brandName}`, infer nextUnscanned>
	) ?
		brandName extends "" ?
			state.error<emptyBrandNameMessage>
		:	state.setRoot<s, [s["root"], "#", brandName], nextUnscanned>
	:	never
