import type { DynamicStateWithRoot } from "../../reduce/dynamic.ts"
import type { StaticState, state } from "../../reduce/static.ts"
import type { Scanner } from "../scanner.ts"

export const parseBrand = (s: DynamicStateWithRoot): void => {
	s.scanner.shiftUntilNonWhitespace()
	const brandName = s.scanner.shiftUntilNextTerminator()
	if (brandName === "") return s.error(emptyBrandNameMessage)
	s.root = s.root.brand(brandName)
}

export type parseBrand<s extends StaticState> =
	Scanner.shiftUntilNextTerminator<
		Scanner.skipWhitespace<s["unscanned"]>
	> extends Scanner.shiftResult<`${infer brandName}`, infer nextUnscanned> ?
		brandName extends "" ?
			state.error<emptyBrandNameMessage>
		:	state.setRoot<s, [s["root"], "#", brandName], nextUnscanned>
	:	never

export const emptyBrandNameMessage = `Expected a non-empty brand name after #`

export type emptyBrandNameMessage = typeof emptyBrandNameMessage
