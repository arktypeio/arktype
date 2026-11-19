import { formatRatio, list } from "../../lib/bench/bench.ts"
import { isWellKnown, isWrittenByUs } from "../../lib/bench/leaderboard.ts"
import { ntwineRows } from "../../lib/bench/scoreboard.ts"
import {
	incumbent,
	ownFigures,
	sourcesOf,
	unitBoards,
	type UnitBoard
} from "../../lib/bench/units.ts"
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

export { incumbent }

export type BoardBar = {
	library: string
	kind: "ours" | "rival" | "incumbent"
	/** its place among every library that ran the graph's results: "4th" */
	place: string
	/** its mean in the graph's unit: "2,863", "1.52 kB" */
	text: string
	/** the same library on our own benchmark, where it is on it: "794 ns" */
	beside?: string
	/** ArkType's lane only, the line under its bar */
	sub?: string
	/** its length as a share of the axis */
	w: number
	/** whether its mean is past the end of the axis */
	cut: boolean
	/** drawn only where there is room for every rival: a phone keeps the best one */
	wide?: true
	/** how many libraries place between it and the lane drawn above it */
	gap: BoardGap
}

export type BoardGap = {
	/** with every rival drawn */
	wide: number
	/** with only the best rival drawn, as on a phone */
	narrow: number
}

export type BoardTick = {
	/** its share of the axis */
	at: number
	label: string
}

export type BoardBadge = {
	/** ArkType's place on the graph, in plain order: "1st" */
	place: string
	/** what that place is among: "of the 5 libraries that ran all 22 results" */
	text: string
}

export type BoardGraph = {
	id: Category["id"]
	title: string
	/** unit · where the results are from */
	caption: string
	bars: BoardBar[]
	ticks: BoardTick[]
	/** ArkType's mean as a share of the axis, marked on every track */
	mark: number
	badge: BoardBadge
}

const graphTitles: Record<Category["id"], string> = {
	speed: "Validation speed",
	startup: "Startup",
	size: "Bundle size"
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`

/** "2 other projects' benchmarks", "1 other project's benchmark" */
const otherProjects = (n: number) =>
	n === 1 ? "1 other project's benchmark" : `${n} other projects' benchmarks`

/**
 * unit · where its results are from: how many, from how many other projects'
 * benchmarks. A graph that averages a result whose code for each library we
 * wrote names its sources instead, since "other projects' benchmarks" would
 * count that one as something it isn't.
 */
export const captionOf = (board: UnitBoard) => {
	const sources = sourcesOf(board)
	const from =
		sources.some(source => isWrittenByUs(source.label)) ?
			list(sources.map(source => source.label))
		:	`${count(board.rows.length, "result")} from ${otherProjects(sources.length)}`
	return `${board.unit} · ${from}`
}

/**
 * The line under ArkType's bar: the same build on our own benchmark, in the
 * unit most readers think in. Size has none, being in kilobytes already.
 */
const subOf = (board: UnitBoard) => {
	const own = ownFigures[board.id].ArkType
	if (!own) return
	return board.id === "speed" ?
			`${own.text} · ${own.rate} validations a second on our benchmark`
		:	`${own.text} from import to first validation on our apps`
}

/**
 * ArkType's place on its graph and how many libraries that is among: every
 * one that ran all of the graph's results, named or not, in plain order.
 */
const badgeOf = (board: UnitBoard): BoardBadge => {
	const ours = board.standings.find(s => s.library === "ArkType")!
	const results = board.rows.length
	return {
		place: ordinal(ours.place),
		text: `of the ${board.standings.length} libraries that ran ${results === 2 ? "both results" : `all ${results} results`}`
	}
}

/**
 * The axis reaches the best rival's bar, and past it any bar under this many
 * times the shortest. A longer one is drawn to the end of the axis and cut:
 * its number, printed beside it, is its length.
 */
const cutBeyond = 16

/** the lengths an axis may have, as multiples of a power of ten: each has round quarters */
const axisSteps = [1, 1.2, 1.6, 2, 2.4, 3.2, 4, 6, 8, 10]

/** the shortest axis with round quarters that holds `value` */
const axisOver = (value: number) => {
	const power = 10 ** Math.floor(Math.log10(value))
	return axisSteps.map(step => step * power).find(max => max >= value)!
}

/**
 * The board, a graph a category, by lib/bench/units.ts's rule: the results
 * are other projects' benchmarks, each bar the geometric mean of a library's
 * results in the unit they were measured in, and each place among every
 * library that ran all of them. The lanes are ArkType, the best three of the
 * other libraries the site names, and Zod, which most readers are choosing
 * against, wherever it places.
 */
export const boardGraphs = (): BoardGraph[] =>
	categories.map(category => {
		const board = unitBoards[category.id]
		const indexOf = (library: string) =>
			board.standings.findIndex(s => s.library === library)
		const [bestRival] = board.lanes.filter(
			library => library !== "ArkType" && library !== incumbent
		)
		const narrow = board.lanes.filter(
			library =>
				library === "ArkType" || library === incumbent || library === bestRival
		)
		// how many places lie between a lane and the one drawn above it
		const gapIn = (drawn: string[], library: string) => {
			const at = drawn.indexOf(library)
			return at > 0 ? indexOf(library) - indexOf(drawn[at - 1]) - 1 : 0
		}
		const values = board.lanes.map(
			library => board.standings[indexOf(library)].value
		)
		const [shortest, next] = values.toSorted((l, r) => l - r)
		const max = axisOver(
			Math.max(next, ...values.filter(value => value < shortest * cutBeyond))
		)
		return {
			id: category.id,
			title: graphTitles[category.id],
			caption: captionOf(board),
			bars: board.lanes.map((library): BoardBar => {
				const { value, place } = board.standings[indexOf(library)]
				const kind =
					library === "ArkType" ? "ours"
					: library === incumbent ? "incumbent"
					: "rival"
				const sub = kind === "ours" ? subOf(board) : undefined
				const beside =
					kind === "ours" ? undefined : ownFigures[board.id][library]?.text
				return {
					library,
					kind,
					place: ordinal(place),
					text: board.format(value),
					...(beside ? { beside } : {}),
					...(sub ? { sub } : {}),
					w: Math.min(value, max) / max,
					cut: value > max,
					...(narrow.includes(library) ? {} : { wide: true }),
					gap: {
						wide: gapIn(board.lanes, library),
						narrow: narrow.includes(library) ? gapIn(narrow, library) : 0
					}
				}
			}),
			ticks: [0.25, 0.5, 0.75, 1].map(at => ({
				at,
				label: board.tick(max * at, at === 1)
			})),
			mark: board.standings[indexOf("ArkType")].value / max,
			badge: badgeOf(board)
		}
	})

export type BoardTableCell = {
	/** "2nd" */
	place: string
	/** its mean in the graph's unit: "2,863" */
	text: string
	first: boolean
}

export type BoardTableRow = {
	library: string
	/** null where it didn't run every result the graph averages */
	cells: Record<Category["id"], BoardTableCell | null>
}

/**
 * Every number on the board, a library a row: each library the site names
 * that a graph ranks, in the order the graphs first rank it, with its mean
 * and its place in each graph. Places count every library, named or not.
 */
export const boardTable = (): BoardTableRow[] => {
	const ids = categories.map(category => category.id)
	const libraries = [
		...new Set(ids.flatMap(id => unitBoards[id].standings.map(s => s.library)))
	].filter(isWellKnown)
	return libraries.map(library => ({
		library,
		cells: Object.fromEntries(
			ids.map(id => {
				const board = unitBoards[id]
				const standing = board.standings.find(s => s.library === library)
				return [
					id,
					standing ?
						{
							place: ordinal(standing.place),
							text: board.format(standing.value),
							first: standing.place === 1
						}
					:	null
				]
			})
		) as BoardTableRow["cells"]
	}))
}

/** a graph's caption for the table's column: "CPU instructions per validation" */
export const boardUnits = (): Record<Category["id"], string> =>
	Object.fromEntries(
		categories.map(category => [category.id, unitBoards[category.id].unit])
	) as Record<Category["id"], string>

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
