// what a monthly rerun (.github/workflows/leaderboard.yml) changed in the
// stored results, and the pull request body that says so. monthly.ts reads the
// files and runs the commands; everything here is a function of their text, so
// ark/repo/__tests__/monthlyReport.test.ts can pin it down

export type Json =
	| null
	| boolean
	| number
	| string
	| Json[]
	| { [key: string]: Json }

/** a stored file's text at the commit measured and after the rerun, undefined where it doesn't exist */
export type FileChange = {
	path: string
	before?: string | undefined
	after?: string | undefined
}

/** one value of a JSON file, at the keys leading to it */
export type LeafChange = {
	path: string[]
	before?: Json | undefined
	after?: Json | undefined
}

/** one result on the leaderboard: a library on a suite's row */
export type RowChange = {
	category: string
	suite: string
	row: string
	library: string
	before?: number | undefined
	after?: number | undefined
}

/** a rival as a suite installed it */
export type VersionRow = {
	suite: string
	package: string
	before?: string | undefined
	after?: string | undefined
}

/** headline.ts's run: its list of claims, or why claims.ts threw */
export type ClaimsCheck = {
	ok: boolean
	output: string
}

export type ClaimChange = {
	id: string
	before?: string | undefined
	after?: string | undefined
}

/** the checked-in text the docs build writes from the numbers (writeMarkdown.ts) */
export type Derived = {
	/** the files whose text the new numbers changed */
	regenerated: string[]
	/** those of them that already trailed their sources at the commit measured, so their diff holds more than the numbers */
	stale?: string[]
	/** why it wasn't written again, if it wasn't */
	skipped?: string
}

export type Standings = {
	before: string
	after: string
}

/** a library's place and geometric mean on a category's board, as standings.ts prints them */
export type StandingChange = {
	category: string
	library: string
	before?: Standing | undefined
	after?: Standing | undefined
}

export type Standing = {
	place: number
	/** its geometric mean in the board's unit, as printed: "1.35 kB" */
	score: string
}

export type Report = {
	/** the day of the run */
	date: string
	/** the commit ArkType was measured at */
	commit: string
	/** the branch the workflow ran on, which the pull request is against */
	base: string
	/** the branch the pull request is from */
	branch: string
	suites: Suites
	runner: string
	claimsBefore: ClaimsCheck
	claimsAfter: ClaimsCheck
	files: FileChange[]
	derived: Derived
	standings?: Standings | undefined
}

/** `size` is what a hosted runner measures faithfully; `all` adds the instruction counts, which need perf */
export type Suites = "size" | "all"

type Leaderboard = {
	suites: LeaderboardSuite[]
}

type LeaderboardSuite = {
	category: string
	id: string
	label: string
	rows: LeaderboardRow[]
}

type LeaderboardRow = {
	id: string
	results: Record<string, number>
}

type RunRecord = {
	installed: Record<string, string>
	held?: Record<string, HeldRecord>
}

type HeldRecord = {
	newest: string
	kept: string
}

/** a rival a suite couldn't build at its newest release (reproduce.ts), so measured at an earlier one */
export type HeldRow = {
	suite: string
	package: string
	newest: string
	kept: string
}

type Leaf = {
	path: string[]
	value: Json
}

export const title = "bench: monthly standings"

export const leaderboardPath = "ark/docs/lib/bench/leaderboard.json"

const runPath = "ark/repo/bench/external/results/newest/run.json"

/** the branch a run's pull request is from: one for the default branch, and one a branch for a run dispatched on another, so neither overwrites the other's open pull request */
export const branchFor = (base: string, defaultBranch: string): string =>
	base === defaultBranch ?
		"bench/monthly-standings"
	:	`bench/monthly-standings-${base}`

// a run's own date and commit change every month whatever it measured, so
// they alone aren't a change to review
const isVolatile = (path: string[]) =>
	// leaderboard.json's `measured`, at its root and under each suite, says
	// when and at which commit a result was measured
	path.includes("measured") ||
	["commit", "date"].includes(path[path.length - 1])

// what names an element among its siblings, so a row added or reordered
// doesn't read as a change to every row after it
const keyOf = (element: Json, index: number) => {
	if (element === null || typeof element !== "object" || Array.isArray(element))
		return String(index)
	if (typeof element.apps === "string")
		return `${element.apps} ${String(element.seed)}`
	for (const name of ["id", "app", "fileName", "libraryName", "types"]) {
		const id = element[name]
		if (typeof id === "string" || typeof id === "number") return String(id)
	}
	return String(index)
}

const leavesOf = (
	value: Json,
	path: string[] = [],
	leaves = new Map<string, Leaf>()
) => {
	const entries =
		value === null || typeof value !== "object" ? undefined
		: Array.isArray(value) ?
			value.map((element, i) => [keyOf(element, i), element] as const)
		:	Object.entries(value)
	if (!entries?.length) leaves.set(JSON.stringify(path), { path, value })
	else
		for (const [key, child] of entries) leavesOf(child, [...path, key], leaves)
	return leaves
}

/** every value that differs between two JSON documents, but a run's own date and commit */
export const leafChangesOf = (
	before: Json | undefined,
	after: Json | undefined
): LeafChange[] => {
	const was = before === undefined ? new Map<string, Leaf>() : leavesOf(before)
	const is = after === undefined ? new Map<string, Leaf>() : leavesOf(after)
	const changes: LeafChange[] = []
	for (const [key, { path, value }] of is) {
		const prior = was.get(key)
		if (isVolatile(path)) continue
		if (!prior) changes.push({ path, after: value })
		else if (JSON.stringify(prior.value) !== JSON.stringify(value))
			changes.push({ path, before: prior.value, after: value })
	}
	for (const [key, { path, value }] of was)
		if (!is.has(key) && !isVolatile(path)) changes.push({ path, before: value })
	return changes
}

const parse = (text: string | undefined): Json | undefined =>
	text === undefined ? undefined : JSON.parse(text)

const isJson = (file: FileChange) => file.path.endsWith(".json")

const fileChangesOf = (file: FileChange) =>
	leafChangesOf(parse(file.before), parse(file.after))

/** whether a rerun measured or installed anything new: false where it only restamped its date and commit, which opens no pull request */
export const isMeaningful = (files: readonly FileChange[]): boolean =>
	files.some(file =>
		isJson(file) ? fileChangesOf(file).length > 0 : file.before !== file.after
	)

/** every result that differs between two leaderboard.json texts, in the after's order */
export const rowChangesOf = (
	before: string | undefined,
	after: string | undefined
): RowChange[] => {
	const boards = [before, after].map(
		(text): Leaderboard =>
			text === undefined ? { suites: [] } : JSON.parse(text)
	)
	const cells = boards.map(board => {
		const byKey = new Map<string, RowChange>()
		for (const suite of board.suites) {
			for (const row of suite.rows) {
				for (const [library, value] of Object.entries(row.results)) {
					byKey.set(JSON.stringify([suite.id, row.id, library]), {
						category: suite.category,
						suite: suite.label,
						row: row.id,
						library,
						after: value
					})
				}
			}
		}
		return byKey
	})
	const [was, is] = cells
	const changes: RowChange[] = []
	for (const [key, cell] of is) {
		const prior = was.get(key)?.after
		if (prior !== cell.after) changes.push({ ...cell, before: prior })
	}
	for (const [key, { after: prior, ...cell }] of was)
		if (!is.has(key)) changes.push({ ...cell, before: prior })
	return changes
}

/** each rival's version in each suite's install, from two run.json texts */
export const versionRowsOf = (
	before: string | undefined,
	after: string | undefined
): VersionRow[] => {
	const [was, is] = [before, after].map(
		(text): Record<string, RunRecord> =>
			text === undefined ? {} : JSON.parse(text)
	)
	return [...new Set([...Object.keys(is), ...Object.keys(was)])].flatMap(
		suite => {
			const installed = is[suite]?.installed ?? {}
			const prior = was[suite]?.installed ?? {}
			return [
				...new Set([...Object.keys(installed), ...Object.keys(prior)])
			].map(name => ({
				suite,
				package: name,
				before: prior[name],
				after: installed[name]
			}))
		}
	)
}

/** each rival a run.json text records as held back */
export const heldRowsOf = (run: string | undefined): HeldRow[] =>
	Object.entries(
		(run === undefined ? {} : JSON.parse(run)) as Record<string, RunRecord>
	).flatMap(([suite, { held }]) =>
		Object.entries(held ?? {}).map(([name, { newest, kept }]) => ({
			suite,
			package: name,
			newest,
			kept
		}))
	)

const claimsOf = (check: ClaimsCheck) =>
	Object.fromEntries(
		check.ok ?
			[...check.output.matchAll(/^- (\w+): (.*)$/gm)].map(
				([, id, text]) => [id, text] as const
			)
		:	[]
	)

/** each claim headline.ts lists whose text differs, or that only one run lists */
export const claimChangesOf = (
	before: ClaimsCheck,
	after: ClaimsCheck
): ClaimChange[] => {
	const [was, is] = [claimsOf(before), claimsOf(after)]
	return [...new Set([...Object.keys(is), ...Object.keys(was)])]
		.filter(id => was[id] !== is[id])
		.map(id => ({ id, before: was[id], after: is[id] }))
}

const standingsOf = (printed: string) => {
	const standings = new Map<string, StandingChange>()
	let category = ""
	for (const line of printed.split("\n")) {
		category = /^(\w+) \(/.exec(line)?.[1] ?? category
		const standing = /^ {2}(\d+)\. (.+): (.+)$/.exec(line)
		if (!standing) continue
		const [, place, library, score] = standing
		standings.set(JSON.stringify([category, library]), {
			category,
			library,
			after: { place: Number(place), score }
		})
	}
	return standings
}

/** each library whose place or mean differs between two of standings.ts's printouts, in the after's order */
export const standingChangesOf = (
	before: string,
	after: string
): StandingChange[] => {
	const [was, is] = [standingsOf(before), standingsOf(after)]
	const changes: StandingChange[] = []
	for (const [key, standing] of is) {
		const prior = was.get(key)?.after
		if (
			prior?.place !== standing.after!.place ||
			prior.score !== standing.after!.score
		)
			changes.push({ ...standing, before: prior })
	}
	for (const [key, { after: prior, ...standing }] of was)
		if (!is.has(key)) changes.push({ ...standing, before: prior })
	return changes
}

/** the error a failed `node headline.ts` printed, without its stack */
export const errorOf = (stderr: string): string => {
	const lines = stderr.trim().split("\n")
	const thrown = lines.findIndex(line =>
		/^(\w*Error|\[\w*Error]?):? /.test(line)
	)
	if (thrown === -1) return lines.slice(-5).join("\n")
	const end = lines.findIndex((line, i) => i > thrown && /^\s+at /.test(line))
	return lines
		.slice(thrown, end === -1 ? thrown + 5 : end)
		.join("\n")
		.trim()
}

// GitHub notifies whoever a pull request's body names, and half the libraries
// are scoped packages: @ts-runtypes is someone's login
const code = (text: string) => `\`${text.replace(/`/g, "'")}\``

/** text with each @name outside a code span put in one, so it mentions nobody */
export const unmentioned = (text: string): string =>
	text
		.split(/(`[^`]*`)/)
		.map((part, i) =>
			i % 2 ? part : part.replace(/@[\w-]+(?:\/[\w.-]+)?/g, name => code(name))
		)
		.join("")

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ")

const numberText = (value: number) =>
	Number.isInteger(value) ? String(value)
	: Math.abs(value) >= 100 ? value.toFixed(1)
	: value.toPrecision(4)

const valueText = (value: Json | undefined) =>
	value === undefined ? ""
	: typeof value === "number" ? numberText(value)
	: code(typeof value === "string" ? value : JSON.stringify(value))

const signed = (value: number, text: string) => (value > 0 ? `+${text}` : text)

/** a result's change as its difference and its percentage of the before, or whether it's new or gone */
export const changeText = (
	before: Json | undefined,
	after: Json | undefined
): string => {
	if (before === undefined) return "new"
	if (after === undefined) return "removed"
	if (typeof before !== "number" || typeof after !== "number") return ""
	const delta = after - before
	const percent =
		before === 0 ? "" : (
			` (${signed(delta, ((delta / before) * 100).toFixed(1))}%)`
		)
	return `${signed(delta, numberText(delta))}${percent}`
}

// a pull request's body holds 65536 characters. A table past maxRows says how
// many rows it left to the artifact
const maxRows = 150
const maxBody = 60000

const table = (header: string[], rows: string[][]) => [
	`| ${header.join(" | ")} |`,
	`| ${header.map(() => "---").join(" | ")} |`,
	...rows.slice(0, maxRows).map(row => `| ${row.map(cell).join(" | ")} |`),
	...(rows.length > maxRows ?
		["", `${rows.length - maxRows} more rows are in the run's artifact.`]
	:	[])
]

const details = (summary: string, lines: string[]) => [
	`<details><summary>${summary}</summary>`,
	"",
	...lines,
	"",
	"</details>"
]

const fenced = (text: string) => ["```", text.trimEnd(), "```"]

const leafTable = (changes: LeafChange[]) =>
	table(
		["value", "before", "after", "change"],
		changes.map(({ path, before, after }) => [
			code(path.join(" / ")),
			valueText(before),
			valueText(after),
			changeText(before, after)
		])
	)

const claimsSection = (report: Report) => {
	const { claimsBefore, claimsAfter } = report
	if (!claimsAfter.ok) {
		return [
			"`ark/docs/lib/claims.ts` throws on the new numbers:",
			"",
			...fenced(claimsAfter.output),
			"",
			...(claimsBefore.ok ?
				[
					"Before the rerun every claim held:",
					"",
					unmentioned(claimsBefore.output.trimEnd())
				]
			:	["Before the rerun it threw too:", "", ...fenced(claimsBefore.output)])
		]
	}
	const changes = claimChangesOf(claimsBefore, claimsAfter)
	return [
		!claimsBefore.ok ?
			"Every claim holds on the new numbers. Before the rerun `ark/docs/lib/claims.ts` threw:"
		: changes.length ?
			`Every claim holds on the new numbers, as before. Of those \`ark/docs/lib/bench/headline.ts\` lists, ${changes.length === 1 ? "this one reads" : `these ${changes.length} read`} differently:`
		:	"Every claim holds on the new numbers, and each `ark/docs/lib/bench/headline.ts` lists reads as it did.",
		"",
		...(claimsBefore.ok ? [] : [...fenced(claimsBefore.output), ""]),
		...changes.flatMap(({ id, before, after }) => [
			`- ${code(id)}`,
			...(before === undefined ? [] : [`  - before: ${unmentioned(before)}`]),
			`  - after: ${after === undefined ? "gone" : unmentioned(after)}`
		]),
		...(changes.length ? [""] : []),
		...details("Every claim, after", [
			unmentioned(claimsAfter.output.trimEnd())
		])
	]
}

const notRerun = (suites: Suites) => [
	...(suites === "size" ?
		[
			"- **Speed** (moltar's, schemabenchmarks.dev's, Sury's and ata's suites): they count CPU instructions with `perf`, which needs hardware counters only some GitHub-hosted runners' hosts expose. On Linux with `perf` and `taskset`, after `pnpm i && pnpm build`:",
			"  ```sh",
			"  NODE24=<node 24.14.1> NODE26=<node 26.12.1> pnpm benchExternal all --newest",
			"  ```",
			"  It reruns these size suites too and rewrites `leaderboard.json`. Or dispatch this workflow with `suites: all`: on a hosted runner the run fails at its first step where the host exposes no counters, and is dispatched again.",
			"- **Startup** (`startup.ts`): it counts instructions with `perf` too, and the same command counts it."
		]
	:	[
			"- **Startup's rivals at their newest releases**: `startup.ts` was counted again, but it bundles the repo's own dependencies, so each rival is at the version `pnpm-lock.yaml` pins."
		]),
	"- **The homepage's speed and cold-start rows** (`pnpm benchValidate`, `pnpm benchImport`) and build times (`pnpm benchBuildTime`): wall clock, which on a shared runner measures the neighbors. Rerun them on a quiet machine.",
	"- **Size at scale** (`pnpm benchSizeScale`): bundle bytes, so any machine measures it, but its peak of 13 GiB of memory is more than a hosted runner's 16 GiB leaves it. It takes about half an hour."
]

/** the pull request's body: what was measured, what changed and whether the site's claims still hold */
export const bodyOf = (report: Report): string => {
	const { claimsBefore, claimsAfter, files, derived } = report
	const byPath = (path: string) => files.find(file => file.path === path)
	const board = byPath(leaderboardPath)
	const rows = rowChangesOf(board?.before, board?.after)
	const run = byPath(runPath)
	const versions = versionRowsOf(run?.before, run?.after)
	const moved = versions.filter(row => row.before !== row.after)
	const others = files.filter(
		file => file !== board && file !== run && isJson(file)
	)

	// claims.ts writes the headline from the standings, so a superlative lost
	// is one it stops writing; where copy written by hand claims it, it throws
	const headlines = claimChangesOf(claimsBefore, claimsAfter).filter(
		({ id }) => id === "headline" || id === "boardTitle"
	)
	const head = [
		...(!claimsAfter.ok ?
			[
				"> [!CAUTION]",
				`> **A claim on the site no longer holds${claimsBefore.ok ? "" : ", as before the rerun"}.** \`ark/docs/lib/claims.ts\` throws on these numbers, so the docs build fails on this branch until its copy changes. The error is under "Claims".`,
				""
			]
		: headlines.length ?
			[
				"> [!CAUTION]",
				"> **The site's headline changes on these numbers.**",
				...headlines.map(
					({ id, before, after }) =>
						`> - ${code(id)}: ${before === undefined ? "nothing" : `"${unmentioned(before)}"`} becomes ${after === undefined ? "nothing" : `"${unmentioned(after)}"`}`
				),
				""
			]
		:	[]),
		`The monthly rerun of the benchmarks ${report.suites === "size" ? "a GitHub-hosted runner measures faithfully" : "behind the leaderboard"}: ArkType at ${code(report.commit)} (${code(report.base)}) and each rival at its newest release, measured on ${report.date} on ${code(report.runner)}. Nothing is published until this is merged. Closing it discards the run; next month's opens another if its numbers differ from ${code(report.base)}'s.`,
		"",
		`CI hasn't run here: a pull request opened with the workflow's token triggers no other workflow. Close and reopen it, or push to ${code(report.branch)}, to run the checks.`
	]

	const heldRows = heldRowsOf(run?.after)
	const versionLines = [
		"### Versions",
		"",
		...(heldRows.length ?
			[
				...heldRows.map(
					row =>
						`- ${code(row.package)}: newest ${row.newest} not buildable in ${row.suite}, kept ${row.kept}`
				),
				""
			]
		:	[]),
		...(versions.length === 0 ? ["No suite's install was recorded."]
		: moved.length === 0 ?
			["Every rival is at the release it was measured at before."]
		:	table(
				["suite", "package", "before", "after"],
				moved.map(row => [
					row.suite,
					code(row.package),
					row.before ?? "",
					row.after ?? "removed"
				])
			)),
		...(versions.length ?
			[
				"",
				...details(
					"Every install",
					table(
						["suite", "package", "before", "after"],
						versions.map(row => [
							row.suite,
							code(row.package),
							row.before ?? "",
							row.after ?? "removed"
						])
					)
				)
			]
		:	[])
	]

	const numberLines = [
		"### Numbers that changed",
		"",
		`The leaderboard's results (\`${leaderboardPath}\`), where each rival keeps the better of its installs:`,
		"",
		...(rows.length ?
			table(
				["category", "suite", "result", "library", "before", "after", "change"],
				rows.map(row => [
					row.category,
					row.suite,
					code(row.row),
					code(row.library),
					valueText(row.before),
					valueText(row.after),
					changeText(row.before, row.after)
				])
			)
		:	["None changed."])
	]

	const placeText = (standing: Standing | undefined) =>
		standing ? `${standing.place}. ${standing.score}` : ""
	const standingChanges =
		report.standings ?
			standingChangesOf(report.standings.before, report.standings.after)
		:	[]
	const orderLines =
		standingChanges.length ?
			[
				"",
				"Each place and geometric mean that moved on the board, by the rule the headline follows (`standings.ts`, which runs `ark/docs/lib/bench/units.ts`):",
				"",
				...table(
					["category", "library", "before", "after"],
					standingChanges.map(change => [
						change.category,
						code(change.library),
						placeText(change.before),
						placeText(change.after)
					])
				)
			]
		:	[]

	const otherLines = others.flatMap(file => {
		const changes = fileChangesOf(file)
		return changes.length ?
				[
					"",
					...details(
						`${code(file.path)}: ${changes.length} values`,
						leafTable(changes)
					)
				]
			:	[]
	})

	const derivedLines = [
		"### Generated text",
		"",
		derived.skipped ??
			(derived.regenerated.length ?
				`The docs build writes these from the numbers (\`ark/docs/lib/writeMarkdown.ts\`), and they're written again here: ${derived.regenerated.map(code).join(", ")}.${derived.stale?.length ? ` ${derived.stale.map(code).join(", ")} already trailed ${derived.stale.length === 1 ? "its" : "their"} sources at ${code(report.commit)}, so ${derived.stale.length === 1 ? "its diff holds" : "their diffs hold"} that too. Any other file the docs build would rewrite at that commit is left as it is.` : ""}`
			:	"The docs build writes none of its checked-in text differently for these numbers.")
	]

	const standingsLines =
		report.standings ?
			[
				"",
				...details(
					"Standings after (`standings.ts`)",
					fenced(report.standings.after)
				),
				"",
				...details("Standings before", fenced(report.standings.before))
			]
		:	[]

	const sections = (withDetails: boolean) =>
		[
			...head,
			"",
			...versionLines,
			"",
			...numberLines,
			...orderLines,
			...(withDetails ? otherLines : []),
			"",
			"### Claims",
			"",
			...claimsSection(report),
			...(withDetails ? standingsLines : []),
			"",
			"### Not rerun",
			"",
			...notRerun(report.suites),
			"",
			...derivedLines
		].join("\n")

	const full = sections(true)
	if (full.length <= maxBody) return full
	const short = `${sections(false)}\n\nThe raw results' changes and the standings were too long for a pull request's body: they're in the run's artifact.`
	return short.length <= maxBody ?
			short
		:	`${short.slice(0, maxBody)}\n\nCut short: the rest is in the run's artifact.`
}

/** what the run's page shows when nothing was measured or installed anew */
export const unchangedSummary = (report: Report): string =>
	[
		`The rerun at ${code(report.commit)} on ${report.date} measured and installed nothing new, so it opens no pull request.`,
		"",
		"### Claims",
		"",
		...claimsSection(report)
	].join("\n")
