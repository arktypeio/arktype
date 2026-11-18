/**
 * The runtime benchmark, from benchData.json (generated from the raw samples
 * of one quiet run; its `provenance` says where every number came from).
 * Every figure the homepage states is computed here, so a rerun updates the
 * copy with no hand edits.
 *
 * One ratio source everywhere: the bench's `speedup` (a ratio of medians),
 * truncated by {@link formatRatio}. A sign-test tie (p >= .05) is never drawn
 * as a win.
 */
import data from "./benchData.json" with { type: "json" }
import { preview } from "./preview.ts"

export type Verdict = {
	ratio: number
	speedup: number
	passesWon: string
	p: string
	verdict: "win" | "loss" | "tie"
}

type Tally = Record<Verdict["verdict"], number>

export type Scenario = {
	id: string
	mode: string
	name: string
	/** arms that run a stand-in path on this row: no first-error mode, or no compiled form */
	armNotes?: Record<string, string>
	medianNs: Record<string, number>
	iqrNs: Record<string, [number, number]>
	standaloneVs: Record<string, Verdict>
	standaloneFirstVs?: Record<string, Verdict>
	/** the same comparisons' verdicts in the other runs that day */
	replication: Record<string, Tally>
}

type BenchData = {
	provenance: {
		commit: string
		date: string
		machine: string
		runtime: string
		passes: number
		startup: { commit: string; date: string }
	}
	scenarios: Scenario[]
	size: Record<string, Record<string, { min: number; gzip: number }>>
	startup: Record<string, Record<string, { coldMs: number }>>
}

const bench = data as unknown as BenchData

export const provenance = bench.provenance

export { preview }

/** while precompile is unpublished, the harness that produced the data can't be linked */
export const harness =
	preview ?
		{
			lead: "The harness is ark/repo/bench on the precompile branch, which isn't public yet; featherduster has ",
			link: "its earlier scenarios",
			url: `https://github.com/arktypeio/arktype/tree/${preview.harnessRef}/ark/repo/bench`
		}
	:	{
			lead: "",
			link: "Harness and scenarios",
			url: "https://github.com/arktypeio/arktype/tree/main/ark/repo/bench"
		}

/**
 * fixed order; an arm with no medians isn't drawn. `copies` marks the arms
 * whose parse builds a new object where the others return the input, and
 * `variant` a note that tells two rows of one library apart, so phones keep it.
 */
const arms = [
	{ key: "standalone", label: "ArkType", note: "", copies: false },
	{ key: "typia", label: "typia", note: "aot", copies: false },
	{ key: "typebox", label: "TypeBox", note: "aot", copies: false },
	{ key: "ajv", label: "ajv", note: "aot", copies: false },
	{ key: "zod", label: "Zod 4", note: "", copies: true },
	{
		key: "zodCompiled",
		label: "Zod 4",
		note: "compiled",
		copies: true,
		variant: true
	},
	{ key: "valibot", label: "Valibot", note: "", copies: true }
]

const competitors = [
	"typia",
	"typebox",
	"ajv",
	"zod",
	"zodCompiled",
	"zodMini",
	"valibot"
]

const labels: Record<string, string> = {
	typia: "typia",
	typebox: "TypeBox",
	ajv: "ajv",
	zod: "Zod 4",
	zodCompiled: "Zod 4 compiled",
	zodMini: "zod/mini",
	valibot: "Valibot"
}

/** 3 significant digits, truncated */
const significant = (v: number) => {
	const k = 10 ** (2 - Math.floor(Math.log10(v)))
	// the epsilon keeps float error (9.12 * 100 = 911.99…) from dropping a stored digit
	return String(Math.floor(v * k + 1e-9) / k)
}

export const formatNs = (ns: number): string =>
	ns >= 1e6 ? `${significant(ns / 1e6)} ms`
	: ns >= 1000 ? `${significant(ns / 1000)} µs`
	: `${significant(ns)} ns`

/** whole from 10×, one decimal from 2×, two below; always truncated */
export const formatRatio = (r: number): string =>
	r >= 10 ? `${Math.floor(r + 1e-9)}×`
	: r >= 2 ? `${Math.floor(r * 10 + 1e-9) / 10}×`
	: `${Math.floor(r * 100 + 1e-9) / 100}×`

const kb = (bytes: number) => `${Math.floor(bytes / 100) / 10} KB`

export const list = (xs: string[]) =>
	xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`

const find = (id: string) => {
	const s = bench.scenarios.find(s => s.id === id)
	if (!s) throw new Error(`No benchmark scenario ${id}`)
	return s
}

/** first-error rows compare the errors: "first" build, everything else the default build */
const ours = (s: Scenario) =>
	s.mode === "first" && s.standaloneFirstVs ?
		{ key: "standaloneFirst", vs: s.standaloneFirstVs }
	:	{ key: "standalone", vs: s.standaloneVs }

const fastestOther = (s: Scenario) =>
	competitors
		.filter(c => s.medianNs[c] !== undefined)
		.sort((a, b) => s.medianNs[a] - s.medianNs[b])[0]

/** "Other runs that day (5): ArkType faster in 4, tied in 1." */
const replicated = (s: Scenario, key: string) => {
	const tally = s.replication[key]
	const runs = tally.win + tally.loss + tally.tie
	if (!runs) return ""
	const parts = [
		tally.win && `ArkType faster in ${tally.win}`,
		tally.tie && `tied in ${tally.tie}`,
		tally.loss && `${labels[key]} faster in ${tally.loss}`
	].filter(Boolean)
	return `Other runs that day (${runs}): ${parts.join(", ")}.`
}

/** "ArkType is 4.6× faster than Zod 4 and 19× faster than Valibot, and Zod 4 compiled is 1.1× faster than ArkType" */
const versusEach = (s: Scenario, keys: string[]) => {
	const { vs } = ours(s)
	const measured = keys.filter(key => vs[key])
	const wins = measured.filter(key => vs[key].verdict === "win")
	return [
		...(wins.length ?
			[
				`ArkType is ${list(
					wins.map(
						key => `${formatRatio(vs[key].speedup)} faster than ${labels[key]}`
					)
				)}`
			]
		:	[]),
		...measured
			.filter(key => vs[key].verdict === "tie")
			.map(key => `it ties ${labels[key]}`),
		...measured
			.filter(key => vs[key].verdict === "loss")
			.map(
				key =>
					`${labels[key]} is ${formatRatio(1 / vs[key].speedup)} faster than ArkType`
			)
	].join(", and ")
}

/** the rows where every library removes undeclared keys, so the copying libraries compare like for like */
const stripRows = () => bench.scenarios.filter(s => s.mode === "strip")

const copyingKeys = arms.filter(arm => arm.copies).map(arm => arm.key)

/** the parse rows whose output is new for every library, as each transforms or defaults its input; ArkType's Types there remove undeclared keys, as Zod's do */
const transformingRows = new Set(
	[
		"parse morph",
		"parse defaults",
		"parse items morph",
		"parse items defaults",
		"parse moltar morph"
	].map(id => find(id).id)
)

export type BenchSet = "valid" | "invalid"

type Domain = { min: number; max: number; ticks: number[] }

const domains: Record<BenchSet, Domain> = {
	valid: { min: 0.5, max: 100, ticks: [1, 3, 10, 30, 100] },
	invalid: { min: 0.2, max: 100, ticks: [1, 3, 10, 30, 100] }
}

const panelsBySet: Record<
	BenchSet,
	[id: string, title: string, blurb: string][]
> = {
	valid: [
		[
			"parse moltar",
			"moltar",
			"7 keys and a nested object: moltar's public benchmark"
		],
		["parse product", "product", "11 keys, a Date, nested arrays of objects"],
		[
			"strip moltar",
			"moltar, undeclared keys removed",
			"what Zod and Valibot always do, so every library does the same work"
		],
		[
			"strip product",
			"product, undeclared keys removed",
			"the same like-for-like comparison, on product"
		],
		[
			"parse discriminated",
			"discriminated union",
			"4 object branches keyed on kind"
		],
		["parse tree", "recursive tree", "40 nodes, depth 3"],
		[
			"parse constraints",
			"constraints",
			"email, regex, length and range bounds"
		],
		["parse items", "items", "an array of 100 small objects"]
	],
	invalid: [
		["errors moltar", "moltar, 1 error", "every error, with its message"],
		["errors product", "product, 16 errors", "every error, with its message"],
		[
			"first product",
			"product, first error",
			`the errors: "first" build against ajv's default`
		]
	]
}

/** the strip row for the same input, where every library removes undeclared keys */
const likeForLike = (s: Scenario, key: string, label: string) => {
	const strip = bench.scenarios.find(
		x => x.id === s.id.replace(/^parse /, "strip ")
	)
	const lead = `${label} returns a new object here and ArkType the input`
	if (!strip?.standaloneVs[key])
		return `${lead}; the strip rows in the table compare like for like.`
	return `${lead}; on ${strip.id}, where every library removes undeclared keys, ${versusEach(strip, [key])}.`
}

export type BenchRow = {
	label: string
	/** "aot", "compiled* · copies": `kept` notes show at every width */
	notes: { text: string; kept: boolean }[]
	ns: string
	ours: boolean
	faster: boolean
	tie: boolean
	/** "1.36×", "3.2× faster" or "" for a tie */
	ratio: string
	/** percentages of the track */
	left: number
	width: number
	clipped: boolean
	tip: string
}

export type BenchPanel = {
	id: string
	title: string
	blurb: string
	pill: { text: string; loss: boolean }
	/** where the 1× rule sits, as a percentage of the track */
	one: number
	rows: BenchRow[]
	ticks: {
		label: string
		left: number
		one: boolean
		end: boolean
		/** between powers of ten */
		minor: boolean
	}[]
	description: string
}

const panel = (
	id: string,
	title: string,
	blurb: string,
	domain: Domain
): BenchPanel => {
	const s = find(id)
	const { key: oursKey, vs } = ours(s)
	const lmin = Math.log10(domain.min)
	const span = Math.log10(domain.max) - lmin
	const x = (r: number) =>
		Math.max(0, Math.min(100, ((Math.log10(r) - lmin) / span) * 100))
	const one = x(1)
	const top = fastestOther(s)
	const topVs = vs[top]
	const pill =
		topVs.verdict === "tie" ? { text: `≈ tie · ${labels[top]}`, loss: false }
		: topVs.verdict === "win" ?
			{
				text: `${formatRatio(topVs.speedup)} ahead of ${labels[top]}`,
				loss: false
			}
		:	{
				text: `${labels[top]} ${formatRatio(1 / topVs.speedup)} faster`,
				loss: true
			}
	const drawn = arms.filter(
		arm =>
			s.medianNs[arm.key === "standalone" ? oursKey : arm.key] !== undefined
	)
	const rows = drawn.map((arm): BenchRow => {
		const key = arm.key === "standalone" ? oursKey : arm.key
		const ns = s.medianNs[key]
		if (arm.key === "standalone") {
			return {
				label: arm.label,
				notes: [],
				ns: formatNs(ns),
				ours: true,
				faster: false,
				tie: false,
				ratio: "1×",
				left: one,
				width: 0,
				clipped: false,
				tip: ""
			}
		}
		const v = vs[key]
		const faster = v.speedup < 1
		const tie = v.verdict === "tie"
		const end = x(v.speedup)
		const [lo, hi] = s.iqrNs[key]
		const copies =
			arm.copies && s.mode === "parse" && !transformingRows.has(s.id)
		// * marks an arm running a stand-in path, as in the table
		const standIn = s.armNotes?.[key]
		const mark = standIn ? "*" : ""
		const label = arm.note ? arm.label : `${arm.label}${mark}`
		const notes = [
			{ text: arm.note && `${arm.note}${mark}`, kept: !!arm.variant },
			{ text: copies ? "copies" : "", kept: false }
		].filter(note => note.text)
		const note = notes.map(note => note.text).join(" · ")
		const name = `${label}${note ? ` (${note})` : ""}`
		const verdict =
			tie ? "a tie"
			: v.verdict === "win" ? "ArkType faster"
			: `${arm.label} faster`
		return {
			label,
			notes,
			ns: formatNs(ns),
			ours: false,
			faster,
			tie,
			ratio:
				tie ? ""
				: faster ? `${formatRatio(1 / v.speedup)} faster`
				: formatRatio(v.speedup),
			left: Math.min(one, end),
			width: Math.max(Math.abs(end - one), 0.6),
			clipped: v.speedup > domain.max,
			tip: [
				`${name}: median ${formatNs(ns)}, IQR ${formatNs(lo)} to ${formatNs(hi)}. ArkType was faster in ${v.passesWon} paired passes; sign test p ${v.p}: ${verdict}.`,
				replicated(s, key),
				standIn && `${labels[key]} ${standIn} here.`,
				copies && likeForLike(s, key, labels[key])
			]
				.filter(Boolean)
				.join(" ")
		}
	})
	return {
		id,
		title,
		blurb,
		pill,
		one,
		rows,
		ticks: domain.ticks.map(t => ({
			label: `${t}×`,
			left: x(t),
			one: t === 1,
			end: x(t) > 95,
			minor: !Number.isInteger(Math.log10(t))
		})),
		description: `${title}: ${rows
			.map(row =>
				[row.label, ...row.notes.map(note => note.text), row.ns].join(" ")
			)
			.join(", ")}`
	}
}

export const benchPanels = (set: BenchSet): BenchPanel[] =>
	panelsBySet[set].map(([id, title, blurb]) =>
		panel(id, title, blurb, domains[set])
	)

const tableArms = [
	["standalone", "ArkType precompiled"],
	["arktype", "ArkType JIT"],
	["typia", "typia"],
	["typebox", "TypeBox"],
	["ajv", "ajv"],
	["zod", "Zod 4"],
	["zodCompiled", "Zod 4 compiled"],
	["zodMini", "zod/mini"],
	["valibot", "Valibot"]
].filter(
	([key]) =>
		key === "standalone" ||
		bench.scenarios.some(s => s.medianNs[key] !== undefined)
)

export type BenchTable = {
	head: string[]
	rows: {
		scenario: string
		firstError: boolean
		/** a trailing * marks an arm running a stand-in path */
		cells: string[]
		fastestOther: string
		verdict: Verdict["verdict"]
		/** "1.36× faster", "3.2× slower" or "≈ tie (p 0.21)" */
		versus: string
	}[]
}

/** every scenario, the text equivalent of the chart */
export const benchTable = (): BenchTable => ({
	head: [
		"scenario",
		...tableArms.map(([, label]) => label),
		"fastest other",
		"ArkType vs it"
	],
	rows: bench.scenarios.map(s => {
		const { key: oursKey, vs } = ours(s)
		const top = fastestOther(s)
		const v = vs[top]
		return {
			scenario: s.id,
			firstError: s.mode === "first",
			cells: tableArms.map(([arm]) => {
				const key = arm === "standalone" ? oursKey : arm
				const ns = s.medianNs[key]
				return (
					ns === undefined ? "—"
					: s.armNotes?.[key] ? `${formatNs(ns)}*`
					: formatNs(ns)
				)
			}),
			fastestOther: labels[top],
			verdict: v.verdict,
			versus:
				v.verdict === "tie" ? `≈ tie (p ${v.p})`
				: v.verdict === "win" ? `${formatRatio(v.speedup)} faster`
				: `${formatRatio(1 / v.speedup)} slower`
		}
	})
})

const reportsErrors = (s: Scenario) =>
	["issues", "errors", "first"].includes(s.mode)

/** error-reporting rows, plus boolean checks of invalid input, which report nothing */
const invalidInput = (s: Scenario) =>
	reportsErrors(s) || s.name.endsWith(" invalid")

const versusFastest = (s: Scenario) => {
	const top = fastestOther(s)
	return { s, top, v: ours(s).vs[top] }
}

type Versus = ReturnType<typeof versusFastest>

const charted = new Set(panelsBySet.valid.map(([id]) => id))

/** "items", "the boolean check of moltar", "strip product" */
const scenarioName = (s: Scenario) =>
	s.id.replace(
		/^(parse|allows) /,
		s.mode === "allows" ? "the boolean check of " : ""
	)

/**
 * each library's rows, the library with the most first: "Zod 4 compiled on
 * strip moltar and strip product; TypeBox on rotating", or "TypeBox on
 * rotating and typia on items" when no library has more than one
 */
const byLibrary = (xs: Versus[], ratio: (x: Versus) => string = () => "") => {
	const groups = Object.values(Object.groupBy(xs, x => x.top))
		.sort((a, b) => b!.length - a!.length)
		.map(
			group =>
				`${labels[group![0].top]} on ${list(
					group!.map(x => `${scenarioName(x.s)}${ratio(x)}`)
				)}`
		)
	return groups.length < xs.length ? groups.join("; ") : list(groups)
}

/** within this of 1× counts as the same speed as the JIT */
const nearJit = 1.1

/** "within 6% of ArkType's JIT in 11 of 13 scenarios; it's 1.51× faster on rotating" */
const versusJit = (scenarios: Scenario[]) => {
	const speedups = scenarios.map(s => ({
		s,
		speedup: ours(s).vs.arktype.speedup
	}))
	const near = speedups.filter(
		x => Math.max(x.speedup, 1 / x.speedup) < nearJit
	)
	const percent = Math.ceil(
		Math.max(...near.map(x => Math.max(x.speedup, 1 / x.speedup) - 1)) * 100 -
			1e-9
	)
	const far = speedups.filter(x => !near.includes(x))
	const within = `within ${percent}% of ArkType's JIT in ${
		far.length ?
			`${near.length} of ${scenarios.length}`
		:	`all ${scenarios.length}`
	} scenarios`
	if (!far.length) return within
	return `${within}; it's ${list(
		far.map(x =>
			x.speedup > 1 ?
				`${formatRatio(x.speedup)} faster on ${scenarioName(x.s)}`
			:	`${formatRatio(1 / x.speedup)} slower on ${scenarioName(x.s)}`
		)
	)}`
}

/**
 * each library faster than ArkType on valid data, head to head (not just the
 * fastest other on a row), most rows first
 */
const fasterLibraries = (scenarios: Scenario[]) =>
	competitors
		.map(key => ({
			key,
			rows: scenarios.filter(s => ours(s).vs[key]?.verdict === "loss")
		}))
		.filter(x => x.rows.length)
		.sort((a, b) => b.rows.length - a.rows.length)

/** "the 2 that remove undeclared keys" when they're every strip row, otherwise the rows by name */
const rowNames = (rows: Scenario[]) => {
	const strip = stripRows()
	return (
			rows.length > 1 &&
				rows.every(s => strip.includes(s)) &&
				rows.length === strip.length
		) ?
			`the ${rows.length} that remove undeclared keys`
		:	list(rows.map(scenarioName))
}

/** a loss most other runs called a tie */
const mostlyTied = ({ s, top }: Pick<Versus, "s" | "top">) => {
	const tally = s.replication[top]
	return tally.tie > tally.loss + tally.win
}

/** every figure the copy states */
export const benchFacts = () => {
	const verdicts = bench.scenarios
		.filter(s => !invalidInput(s))
		.map(versusFastest)
	const ties = verdicts.filter(x => x.v.verdict === "tie")
	const losses = verdicts.filter(x => x.v.verdict === "loss")
	const errorRows = bench.scenarios.filter(reportsErrors)
	const ajvFaster = errorRows
		.map(s => ours(s).vs.ajv)
		.filter(v => v.verdict === "loss")
		.map(v => 1 / v.speedup)
	const rejections = bench.scenarios
		.filter(s => invalidInput(s) && !reportsErrors(s))
		.map(versusFastest)
	const faster = fasterLibraries(verdicts.map(x => x.s))
	// the copy counts wins, ties and each library's rows as disjoint, which holds
	// only while every row a library won is a row lost to the fastest
	if (new Set(faster.flatMap(x => x.rows)).size !== losses.length) {
		throw new Error(
			"A valid-data row lost to a library other than its fastest; the copy would double count it"
		)
	}
	const mostFaster = faster[0]?.rows.length ?? 0
	const others = faster.filter(x => x.rows.length < mostFaster)
	const fasterOn = (x: (typeof faster)[number]) =>
		`${labels[x.key]} on ${rowNames(x.rows)} (${list(
			x.rows.map(s => formatRatio(1 / ours(s).vs[x.key].speedup))
		)})`
	const startup = bench.startup.login
	const size = bench.size.login
	return {
		validCount: verdicts.length,
		validWins: verdicts.filter(x => x.v.verdict === "win").length,
		validTies: ties.length,
		validLosses: losses.length,
		/** "TypeBox on product and typia on items; in the table only, …" */
		ties: [
			ties.filter(x => charted.has(x.s.id)),
			ties.filter(x => !charted.has(x.s.id))
		]
			.map(group => byLibrary(group))
			.filter(Boolean)
			.join("; in the table only, "),
		/** "Zod 4 compiled on strip moltar (1.1×) and strip product (1.23×)" */
		losses: byLibrary(losses, x => ` (${formatRatio(1 / x.v.speedup)})`),
		/** the most valid-data rows any one library was faster than ArkType on */
		mostFaster,
		/** "Zod 4 compiled on the 2 that remove undeclared keys (1.1× and 1.23×)": every library with {@link mostFaster} rows */
		mostFasterBy: list(
			faster.filter(x => x.rows.length === mostFaster).map(fasterOn)
		),
		/** "TypeBox on rotating (1.05×) and typia on the boolean check of moltar (1.08×)": the libraries faster on fewer rows */
		fasterOthers: list(others.map(fasterOn)),
		/** whether most other runs that day called every one of {@link fasterOthers} a tie */
		fasterOthersMostlyTied:
			others.length > 0 &&
			others.every(x => x.rows.every(s => mostlyTied({ s, top: x.key }))),
		/** `{ "Zod 4 compiled": 2, TypeBox: 1, typia: 1 }` */
		fasterCounts: faster.map(x => [labels[x.key], x.rows.length] as const),
		/** the losses most other runs that day called a tie */
		unsteadyLosses: byLibrary(losses.filter(mostlyTied)),
		versusJit: versusJit(verdicts.map(x => x.s)),
		errorCount: errorRows.length,
		ajvFasterCount: ajvFaster.length,
		ajvMin: formatRatio(Math.min(...ajvFaster)),
		ajvMax: formatRatio(Math.max(...ajvFaster)),
		/** "1.35× ahead of typia": the boolean checks of invalid input */
		rejection: list(
			rejections.map(x =>
				x.v.verdict === "tie" ? `tied with ${labels[x.top]}`
				: x.v.verdict === "win" ?
					`${formatRatio(x.v.speedup)} ahead of ${labels[x.top]}`
				:	`${formatRatio(1 / x.v.speedup)} behind ${labels[x.top]}`
			)
		),
		coldStandalone: `${startup.standalone.coldMs} ms`,
		coldJit: `${startup.arktype.coldMs} ms`,
		sizeStandalone: kb(size.standalone.gzip),
		sizeJit: kb(size.arktype.gzip),
		scenarioCount: bench.scenarios.length
	}
}

export type BenchFacts = ReturnType<typeof benchFacts>

/** the default build against one library on every scenario it ran */
export const versusLibrary = (key: string) => {
	const measured = bench.scenarios.filter(s => s.standaloneVs[key])
	const lost = measured.filter(s => s.standaloneVs[key].verdict === "loss")
	return {
		count: measured.length,
		wins: measured.filter(s => s.standaloneVs[key].verdict === "win").length,
		lost,
		/** "items morph and moltar morph" */
		losses: list(lost.map(scenarioName)),
		/** each scenario's ratio of the library's median to ArkType's, so above 1 is ArkType faster */
		rows: measured.map(s => ({
			name: scenarioName(s),
			speedup: s.standaloneVs[key].speedup,
			verdict: s.standaloneVs[key].verdict,
			/** the library's median per call, then ArkType's */
			ns: formatNs(s.medianNs[key]),
			oursNs: formatNs(s.medianNs.standalone)
		}))
	}
}

export type LibraryVersus = ReturnType<typeof versusLibrary>

/** the footnote, as paragraphs of plain text: the method, what differs between arms, then startup */
export const benchNotes = (): string[] => [
	`Median ns per call over ${provenance.passes} passes, each running every library in a fresh process, outputs checked against ArkType's before timing. Ties are a two-sided sign test over paired passes at p ≥ .05; ratios are of the medians, truncated. ${provenance.runtime} on ${provenance.machine}, measured ${provenance.date} on ${
		preview ?
			`the precompile branch (${provenance.commit}), which hasn't shipped; the numbers will be rerun on the release commit.`
		:	`${provenance.commit}.`
	}`,
	`Zod's parse, compiled or not, and Valibot's remove undeclared keys and return a copy, where ArkType, typia, TypeBox and ajv return the input as is. The strip rows compare like for like, since every library removes them there, as do the rows that transform or default their input, where every library returns new output and ArkType's Types remove undeclared keys too. ${stripRows()
		.map(s => `On ${s.id}, ${versusEach(s, copyingKeys)}.`)
		.join(" ")}`,
	[
		...new Set(
			bench.scenarios.flatMap(s =>
				Object.entries(s.armNotes ?? {}).map(([key, note]) =>
					s.mode === "first" ?
						`On the first-error rows, arms marked * have no first-error mode and report every error.`
					:	`${labels[key]} on ${s.id} (marked *) ${note}.`
				)
			)
		)
	].join(" "),
	`Cold start and size, precompiled against the JIT, are for a login form app (an email and a password check) bundled and minified with esbuild. Cold start is the median time for a fresh Node process to import the bundle and validate once, measured ${provenance.startup.date} at ${provenance.startup.commit}; size is the gzipped bundle, the validators and the library code they import.`
]
