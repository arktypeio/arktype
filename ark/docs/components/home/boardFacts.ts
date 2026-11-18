import { formatRatio } from "../../lib/bench/bench.ts"
import { categories, type Category } from "../../lib/claims.ts"

/** one of the board's categories, as lib/claims.ts states it */
export const categoryOf = <id extends Category["id"]>(
	id: id
): Extract<Category, { id: id }> =>
	categories.find(
		(category): category is Extract<Category, { id: id }> => category.id === id
	)!

export type StartupBar = {
	name: string
	/** million instructions from import through the first validation */
	value: number
}

/**
 * The login app's cold start, ArkType's bar first: each library's bar, and
 * ArkType's margin over Zod and Valibot as the board has always worded them
 */
export const startupFacts = () => {
	const category = categoryOf("startup")
	const [ours, ...rivals]: StartupBar[] = category.bars.map(bar => ({
		name: bar.kind === "precompiled" ? "ArkType" : bar.name,
		value: bar.value!
	}))
	const zod = rivals.find(bar => bar.name === "Zod")!
	const valibot = rivals.find(bar => bar.name === "Valibot")!
	return {
		category,
		ours,
		rivals,
		/** "49×" */
		zodRatio: formatRatio(zod.value / ours.value),
		// truncated, so no margin is ever rounded up
		valibotPercent: Math.floor((1 - ours.value / valibot.value) * 100)
	}
}
