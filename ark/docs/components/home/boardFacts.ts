import { formatRatio, list } from "../../lib/bench/bench.ts"
import { isWellKnown, rowsOf } from "../../lib/bench/leaderboard.ts"
import { ntwineRows } from "../../lib/bench/scoreboard.ts"
import {
	categories,
	medianOf,
	ordinal,
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

/**
 * Size's caveat in one line, the way the speed section words its own:
 * `claims.sizeClose`'s facts (ArkType's average against the next best's, and
 * where it places on each size result) from the data that claim is built
 * from. Undefined unless ArkType has the lowest average outright and the
 * library next to it may be named, which is all the line is worded for;
 * the section then prints the claim itself.
 */
export const sizeCloseLine = () => {
	const { leads, ties, average } = categoryOf("size")
	if (!leads || ties || !isWellKnown(average.other.library)) return
	const ranks = rowsOf("size").map(
		results =>
			Object.values(results).filter(bytes => bytes < results.ArkType).length + 1
	)
	const places =
		ranks.every(rank => rank === ranks[0]) ?
			`${ordinal(ranks[0])} on each one`
		:	`${list(ranks.map(ordinal))} on them`
	return `Smallest on average across ${ranks.length} public size results (${formatRatio(average.score)} the best; ${average.other.library} ${formatRatio(average.other.score)}), and ${places}.`
}

/**
 * `claims.bigApp`'s result in one line, for the head of its panel: from the
 * row that claim reads (ntwine, bundled with esbuild), the two margins over
 * Zod 4 a reader came for and the comparison ArkType loses. Each number
 * names the build it belongs to, because they are different builds: the
 * default one is the fast one, the "smallest" preset the small one.
 * Undefined unless every clause of it holds, and the panel then keeps its
 * plain description.
 */
export const bigAppLine = () => {
	const row = ntwineRows.find(row => row.host === "esbuild")
	if (!row) return
	const { precompiled, smallest, zod, zod3 } = row.arms
	if (!precompiled || !smallest || !zod || !zod3) return
	const faster = zod.hot / precompiled.hot
	// truncated, so no margin is ever rounded up
	const less = Math.floor((1 - smallest.gz / zod.gz) * 100)
	const zod3ShipsLeast = zod3.gz < Math.min(smallest.gz, precompiled.gz)
	if (faster < 2 || less < 1 || !zod3ShipsLeast) return
	return `On ntwine, bundled with esbuild: the default build validated ${formatRatio(faster)} as fast as Zod 4, and the "smallest" preset shipped ${less}% less. Zod 3 shipped less than either.`
}

/**
 * A size or a claim from lib/, with its kilobytes written as the page's own
 * figures write them ("kB"). The numbers and the words are the source's.
 */
export const kB = (text: string) => text.replaceAll(" KB", " kB")
