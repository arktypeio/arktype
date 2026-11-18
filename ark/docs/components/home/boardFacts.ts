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

/** how many times the login form's bundle Zod's is, truncated as every ratio on the page is: "24×" */
export const zodSizeRatio = () => {
	const bytes = (name: string) =>
		sizeChart.bars.find(bar => bar.name === name)!.value!
	return formatRatio(bytes("Zod") / bytes("ArkType (precompiled)"))
}

export type HeroStat = {
	/** the section that measures it */
	href: string
	/** the ratio its section leads with */
	value: string
	/** what it is a ratio of */
	unit: string
	/** what it was measured on, said in the same breath */
	scope: string
}

/**
 * The three numbers the page leads with, each against Zod 4 and each the
 * one its own section leads with. The speed ratio is the median lib/claims.ts
 * states; the other two are computed here from the bars the startup and size
 * sections draw, so the hero can never show a number its section doesn't.
 */
export const heroStats = (): HeroStat[] => {
	const [zod] = categoryOf("speed").versus
	return [
		{
			href: "#run",
			value: medianOf(zod.versus),
			unit: "faster",
			scope: `median of ${zod.versus.count} scenarios`
		},
		{
			href: "#start",
			value: startupFacts().zodRatio,
			unit: "less work to start",
			scope: "a login app, import to first validation"
		},
		{
			href: "#size",
			value: zodSizeRatio(),
			unit: "smaller",
			scope: `${loginKb("Zod")} → ${loginKb("ArkType (precompiled)")} kB gzipped, on Valibot's own login form`
		}
	]
}
