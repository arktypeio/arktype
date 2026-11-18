import { formatRatio, list } from "../../lib/bench/bench.ts"
import {
	isWellKnown,
	leaderboards,
	rowsOf
} from "../../lib/bench/leaderboard.ts"
import { ntwineRows } from "../../lib/bench/scoreboard.ts"
import {
	averageText,
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
	return `Smallest on average across the ${ranks.length} size results (${formatRatio(average.score)} the best; ${average.other.library} ${formatRatio(average.other.score)}), and ${places}.`
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

/** where the site says how every number on the homepage was measured */
export const methodHref = "/docs/precompile/benchmarks"

/** an average as a multiple of the best result: "1.252×", "19.7×", "13.8k×" */
export const multiple = (score: number) =>
	score < 10 ? `${averageText(score)}×`
	: score < 1e3 ? `${score.toPrecision(3)}×`
	: score < 1e6 ? `${(score / 1e3).toPrecision(3)}k×`
	: `${(score / 1e6).toPrecision(3)}M×`

/** the library every graph on the page keeps in view, wherever it places */
export const incumbent = "Zod"

export type BoardBar = {
	library: string
	/** its best average, as a multiple of the best result */
	score: number
	/** its place among every library ranked, named on the site or not: "4th" */
	place: string
	kind: "ours" | "rival" | "incumbent"
	/** drawn only where there is room for every rival: a phone keeps the best one */
	wide?: true
}

/** how many libraries are ranked between the incumbent and the last bar drawn above it */
export type BoardGap = {
	/** with every rival drawn */
	wide: number
	/** with only the best rival drawn, as on a phone */
	narrow: number
}

export type BoardGraph = {
	id: Category["id"]
	title: string
	/** how many results its averages are over */
	results: number
	/** how many libraries it ranks */
	ranked: number
	bars: BoardBar[]
	skipped: BoardGap
}

const graphTitles: Record<Category["id"], string> = {
	speed: "Validation speed",
	startup: "Startup",
	size: "Bundle size"
}

/** the rivals drawn under ArkType before the graph skips to the incumbent */
const rivalsDrawn = 3

/**
 * The board, a graph a category: ArkType, the best of the other libraries
 * the site names, and Zod, which most readers are choosing against, at
 * whatever place it holds. Scores and places are the leaderboard's own
 * (lib/bench/leaderboard.ts), every library counted; ArkType's place is the
 * one lib/claims.ts gives it, "1st" only where it may claim it.
 */
export const boardGraphs = (): BoardGraph[] =>
	categories.map(category => {
		const { standings, rows } = leaderboards[category.id]
		const placeOf = (library: string) =>
			library === "ArkType" ?
				category.place
			:	ordinal(standings.findIndex(s => s.library === library) + 1)
		const indexOf = (library: string) =>
			standings.findIndex(s => s.library === library)
		const barOf = (library: string, kind: BoardBar["kind"]): BoardBar => ({
			library,
			score: standings[indexOf(library)].score,
			place: placeOf(library),
			kind
		})
		const rivals = standings
			.filter(s => s.library !== "ArkType" && isWellKnown(s.library))
			.slice(0, rivalsDrawn)
			.map(s => s.library)
		const at = indexOf(incumbent)
		// from the incumbent up to the nearest of these, not counting either
		const gapAbove = (drawn: string[]) =>
			at - Math.max(...drawn.map(indexOf).filter(index => index < at), -1) - 1
		const apart = !rivals.includes(incumbent)
		return {
			id: category.id,
			title: graphTitles[category.id],
			results: rows,
			ranked: standings.length,
			bars: [
				barOf("ArkType", "ours"),
				...rivals.map(
					(library, i): BoardBar =>
						library === incumbent ? barOf(library, "incumbent")
						: i === 0 ? barOf(library, "rival")
						: { ...barOf(library, "rival"), wide: true }
				),
				...(apart ? [barOf(incumbent, "incumbent")] : [])
			],
			skipped: {
				wide: gapAbove(["ArkType", ...rivals]),
				narrow: gapAbove(["ArkType", ...rivals.slice(0, 1)])
			}
		}
	})

export type SpeedBar = {
	name: string
	/** how many times ArkType's time per call its is, at the median scenario */
	median: number
	/** that, as the claims state it: "15×" */
	text: string
	/** its closest scenario and its farthest: "3×", "259×" */
	closest: string
	farthest: string
	/** scenarios it was slower on, of those both ran */
	slower: number
	of: number
}

/**
 * Each rival on the homepage's benchmark as one number and its spread: the
 * median scenario, the closest and the farthest, and how many it lost. All
 * from the per-scenario ratios the claims' medians are taken from, each
 * truncated as every ratio on the page is.
 */
export const speedBars = (): SpeedBar[] =>
	categoryOf("speed").versus.map(({ name, versus }) => {
		const ratios = versus.rows.map(row => row.speedup)
		return {
			name,
			median: parseFloat(medianOf(versus)),
			text: medianOf(versus),
			closest: formatRatio(Math.min(...ratios)),
			farthest: formatRatio(Math.max(...ratios)),
			slower: versus.wins,
			of: versus.count
		}
	})
