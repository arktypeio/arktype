import { formatRatio } from "../../lib/bench/bench.ts"
import {
	categories,
	medianOf,
	sizeChart,
	type Category
} from "../../lib/claims.ts"

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

/** a bar of the size chart in kilobytes to three figures, as the size section writes them: "1.01" */
export const loginKb = (name: string) => {
	const bar = sizeChart.bars.find(bar => bar.name === name)
	if (!bar || bar.value === null)
		throw new Error(`sizeChart has no ${name} bar`)
	return (bar.value / 1000).toPrecision(3)
}

export type ZodGain = {
	/** the section that measures it */
	href: string
	/** what was measured, in a word or two */
	kicker: string
	/** the number its section leads with */
	value: string
	/** what the number is of, and on what */
	caption: string
}

/**
 * The three numbers the page leads with, each against Zod 4 and each stated
 * as its own section states it: the hero shows them on a narrow screen,
 * where the board is a scroll away, and the migrate section ends on them
 */
export const versusZod = (): ZodGain[] => {
	const [zod] = categoryOf("speed").versus
	return [
		{
			href: "#run",
			kicker: "validation",
			value: medianOf(zod.versus),
			caption: `faster, at the median of ${zod.versus.count} scenarios`
		},
		{
			href: "#start",
			kicker: "cold start",
			value: startupFacts().zodRatio,
			caption: "less startup work, on the login app"
		},
		{
			href: "#size",
			kicker: "bundle",
			value: `${loginKb("Zod")} → ${loginKb("ArkType (precompiled)")} kB`,
			caption: "gzipped, on a login form"
		}
	]
}
