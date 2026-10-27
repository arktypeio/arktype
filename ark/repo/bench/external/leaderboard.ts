// gathers every row of the suites the README's "Best average" lists into
// ark/docs/lib/bench/leaderboard.json, each library under one name and
// ArkType only as its default production build, with each library's npm
// downloads (downloads.ts) and the date its rows were last measured;
// lib/claims.ts averages them
// node leaderboard.ts
// With LEADERBOARD_FRESH, the directory reproduce.ts counts into, each suite
// it holds results for reads them instead, ArkType's rows included, and the
// leaderboard is written there. results/newest/ holds the last run with every
// rival at its newest release (reproduce.ts --newest): each of its files is
// read beside the committed ones, its ArkType rows in place of theirs
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { format, resolveConfig } from "prettier"

const here = import.meta.dirname
const docs = join(here, "..", "..", "..", "docs")

// the stored results each suite reads: its rivals', which don't depend on
// ArkType's build, and ArkType's rows, each measured again on one commit, a
// later file's measures replacing an earlier one's where it remeasures them. A
// suite's rivals were measured twice, at the suite's pinned versions and at
// each library's latest release on 2026-10-24, and each arm keeps the faster
// run (README, "Versions")
const committed = {
	arkType: ["results/arktype-781130da3.json"],
	counts: [
		"results/counts-a306152ce.json",
		"results/counts-latest-2026-10-24.json"
	],
	startup: "results/startup-781130da3-node24.json",
	forms: ["results/forms-642b4517e.json"],
	sbCounts: [
		"results/sb-counts-6c5fd9862.json",
		"results/sb-counts-latest-2026-10-24.json",
		"results/sb-counts-aot-init-2026-10-25.json",
		"results/sb-counts-init-11067f517.json"
	],
	sbDownload: ["results/sb-download-ajv-standalone-2026-10-24.json"],
	suryCounts: [
		"results/sury-counts-6c5fd9862.json",
		"results/sury-counts-latest-2026-10-24.json",
		"results/sury-counts-aot-2026-10-25.json"
	],
	surySize: [
		"results/sury-size-396778442.json",
		"results/sury-size-latest-2026-10-25.json"
	],
	ataCounts: [
		"results/ata-counts-pinned-2026-10-24.json",
		"results/ata-counts-latest-2026-10-24.json"
	],
	// each library's npm downloads, which decide whether the site names it
	downloads: "results/downloads-2026-10-26.json"
}

const freshDir = process.env.LEADERBOARD_FRESH

// a suite's results in freshDir, pinned, latest and newest, if it has any
const freshOf = (name: string) =>
	freshDir ?
		["", "-latest", "-newest"]
			.map(suffix => join(freshDir, `${name}${suffix}.json`))
			.filter(existsSync)
	:	[]

const newestOf = (name: string) =>
	[`results/newest/${name}.json`].filter(path => existsSync(join(here, path)))

const fileNames = {
	counts: "moltar-counts",
	forms: "forms",
	sbCounts: "sb-counts",
	sbDownload: "sb-download",
	suryCounts: "sury-counts",
	surySize: "sury-size",
	ataCounts: "ata-counts"
}

const sources = {
	...committed,
	startup: freshOf("startup")[0] ?? committed.startup
}
for (const [kind, name] of Object.entries(fileNames) as [
	keyof typeof fileNames,
	string
][]) {
	const fresh = freshOf(name)
	const newest = newestOf(name)
	if (fresh.length) sources[kind] = fresh
	else if (newest.length) sources[kind] = [...committed[kind], ...newest]
}

// ArkType's rows measured on one commit, for each suite read from committed results
const arkTypeRowsOf = <kind extends keyof typeof committed>(kind: kind) =>
	sources[kind] === committed[kind] ? arkType : {}

const read = (path: string) =>
	JSON.parse(readFileSync(resolve(here, path), "utf8"))

const median = (values: readonly number[]) => {
	const sorted = [...values].sort((l, r) => l - r)
	const middle = sorted.length >> 1
	return sorted.length % 2 ?
			sorted[middle]
		:	(sorted[middle - 1] + sorted[middle]) / 2
}

// each arm's best result across a suite's runs, by measure; ArkType's arms,
// measured on one commit, from the last run that has them
const bestOf = <result>(
	runs: Record<string, result>[],
	measure: (result: result) => number
) => {
	const best: Record<string, result> = {}
	for (const run of runs) {
		for (const [arm, result] of Object.entries(run)) {
			if (
				!best[arm] ||
				/\barktype\b/i.test(arm) ||
				measure(result) < measure(best[arm])
			)
				best[arm] = result
		}
	}
	return best
}

// each arm's reps from the run with the lowest median
const fastestOf = (paths: readonly string[]) =>
	bestOf<number[]>(paths.map(read), median)

// ArkType's other builds, left out of every row
const otherBuild =
	/^(arktype-(b2|dynamic|2\.2\.9)|standaloneFirst|standaloneSmallest|arktype( (oe|oe-eager|smallest))?|baseline|ArkType \((precompiled, smallest|dynamic)\))$/

const names: Record<string, string> = {
	"arktype-b1": "ArkType",
	standalone: "ArkType",
	"arktype default": "ArkType",
	"ArkType (precompiled, default)": "ArkType",
	zod: "Zod",
	Zod: "Zod",
	zodCompiled: "Zod (compiled)",
	"zod (compiled)": "Zod (compiled)",
	zodMini: "Zod Mini",
	"Zod Mini": "Zod Mini",
	valibot: "Valibot",
	typia: "Typia",
	"typia (createValidate)": "Typia",
	typebox: "TypeBox",
	ajv: "ajv",
	"ajv (standalone, ajv-errors)": "ajv",
	// schemabenchmarks.dev, Sury's and ata's names
	"arktype (precompiled)": "ArkType",
	"arktype/precompiled": "ArkType",
	"zod/mini": "Zod Mini",
	"zod/v3": "Zod 3",
	"ata-validator": "ata",
	"@paseri/paseri": "paseri",
	"@paseri/compiler": "paseri",
	effect: "Effect Schema",
	superstruct: "Superstruct",
	yup: "Yup",
	joi: "Joi",
	Sury: "sury"
}

// a mode in parentheses after a library's name is a variant of it
const nameOf = (arm: string) =>
	names[arm] ??
	arm
		.replace(/^@sinclair\/typebox-.*$/, "TypeBox")
		.replace(/^TypeBox \(.*\)$/, "TypeBox")
		.replace(/-?\s*\((ahead-of-time|just-in-time|JIT compiled)\)$/, "")

type Row = { id: string; results: Record<string, number> }

// each library's best variant on the row
const rowOf = (id: string, byArm: Record<string, number>): Row => {
	const results: Record<string, number> = {}
	for (const [arm, value] of Object.entries(byArm)) {
		if (otherBuild.test(arm)) continue
		const name = nameOf(arm)
		results[name] = Math.min(results[name] ?? Infinity, value)
	}
	return { id, results }
}

const byCase = (entries: [string, number][]) => {
	const cases: Record<string, Record<string, number>> = {}
	for (const [key, value] of entries) {
		const [id, arm] = [
			key.slice(0, key.indexOf(" ")),
			key.slice(key.indexOf(" ") + 1)
		]
		const byArm = (cases[id] ??= {})
		byArm[arm] = Math.min(byArm[arm] ?? Infinity, value)
	}
	return Object.entries(cases).map(([id, byArm]) => rowOf(id, byArm))
}

// each of ArkType's measures from the last file that has it
const arkType: Record<string, any> = {}
for (const rows of sources.arkType.map(read)) {
	for (const [kind, measures] of Object.entries(rows)) {
		arkType[kind] =
			typeof measures === "object" ?
				{ ...arkType[kind], ...(measures as object) }
			:	measures
	}
}

const counts: Record<string, number[]> = {
	...fastestOf(sources.counts),
	...arkTypeRowsOf("counts").moltar
}
const moltar = byCase(
	Object.entries(counts)
		.filter(([key]) => !key.startsWith("sb "))
		.map(([key, reps]) => [key, median(reps)])
)

const bench = read(join(docs, "lib", "bench", "benchData.json"))
const homepage: Row[] = bench.scenarios.map(
	(s: { id: string; medianNs: Record<string, number> }) =>
		rowOf(s.id, s.medianNs)
)
const homepageSize = Object.fromEntries(
	Object.entries(bench.size).map(([app, byArm]) => [
		app,
		{ ...(byArm as object), ...arkType.homepageSize[app] }
	])
)

const startup = read(sources.startup)
const startupMedians = Object.fromEntries(
	Object.entries(startup.samples as Record<string, number[]>).map(
		([key, samples]) => [key, median(samples)]
	)
)
const startupRows = byCase(
	Object.entries(startupMedians)
		.filter(([key]) => !key.endsWith(" baseline"))
		.map(([key, value]) => [
			key,
			value - startupMedians[`${key.slice(0, key.indexOf(" "))} baseline`]
		])
)

const appsOf = (
	byApp: Record<string, Record<string, number | Record<string, number>>>,
	key: string
) =>
	Object.entries(byApp).map(([app, byArm]) =>
		rowOf(
			app,
			Object.fromEntries(
				Object.entries(byArm).map(([arm, value]) => [
					arm,
					(value as Record<string, number>)[key]
				])
			)
		)
	)

const forms: Record<string, { gzip: number }> = {
	...bestOf<{ gzip: number }>(sources.forms.map(read), size => size.gzip),
	...arkTypeRowsOf("forms").form
}

// schemabenchmarks.dev: a label is a library and, in parentheses, its
// variant, except that zod's z.compile variants are Zod (compiled), as the
// homepage names it
const sbNameOf = (label: string) => {
	const [, base, note] = /^(.*?)(?: \((.*)\))?$/.exec(label)!
	if (base.startsWith("zod") && note?.includes("compile"))
		return "Zod (compiled)"
	return note === "precompiled" ? nameOf(label) : nameOf(base)
}
const sbRows = (cases: [string, number][]) => {
	const rows: Record<string, Record<string, number>> = {}
	for (const [key, value] of cases) {
		const [type, dataType, variant, label] = key.slice(3).split("|")
		const id =
			type === "string" ? `string ${variant} ${dataType}`
			: type === "initialization" ? type
			: `${type} ${dataType}`
		const arm = sbNameOf(label)
		const row = (rows[id] ??= {})
		row[arm] = Math.min(row[arm] ?? Infinity, value)
	}
	return Object.entries(rows).map(([id, byArm]) => rowOf(id, byArm))
}
const sbCounts = Object.entries({
	...fastestOf(sources.sbCounts),
	...arkTypeRowsOf("sbCounts").sbCounts
} as Record<string, number[]>).map(([key, reps]): [string, number] => [
	key,
	median(reps)
])
type Download = { libraryName: string; note?: string; gzipBytes: number }
const sbLabelOf = (r: Download) =>
	r.note ? `${r.libraryName} (${r.note})` : r.libraryName
const sbDownload = Object.values(
	bestOf<Download>(
		sources.sbDownload.map(path =>
			Object.fromEntries(
				(read(path).minified as Download[]).map(r => [sbLabelOf(r), r])
			)
		),
		r => r.gzipBytes
	)
).map(r =>
	r.libraryName === "arktype/precompiled" ?
		{
			...r,
			gzipBytes:
				arkTypeRowsOf("sbDownload").sbDownload?.gzipBytes ?? r.gzipBytes
		}
	:	r
)

// Sury's schema benchmark: "parse X" and "build X" rows, sizes as built in
// production
const suryCounts = Object.entries({
	...fastestOf(sources.suryCounts),
	...arkTypeRowsOf("suryCounts").suryCounts
} as Record<string, number[]>).map(([key, reps]): [string, number] => [
	key,
	median(reps)
])
const suryRow = (id: string, prefix: string) =>
	rowOf(
		id,
		Object.fromEntries(
			suryCounts
				.filter(([key]) => key.startsWith(`sury ${prefix} `))
				.map(([key, value]) => [key.slice(`sury ${prefix} `.length), value])
		)
	)
// each bundle's smallest production build of the two installs; a library's
// row is the smaller of its schema arm (the suite's operation) and its check
// arm (its boolean check), as the row compares checks
const surySize: Record<string, { gzip: number }> = {
	...bestOf<{ gzip: number }>(
		sources.surySize.map(path => read(path).production),
		size => size.gzip
	),
	...arkTypeRowsOf("surySize").surySize
}

// ata's validator-benchmarks: a scene and a body per row; its arktype adapter
// is the default precompiled build
const ataRows = byCase(
	Object.entries({
		...fastestOf(sources.ataCounts),
		...arkTypeRowsOf("ataCounts").ataCounts
	} as Record<string, number[]>).map(([key, reps]): [string, number] => {
		const [scene, body, lib] = key.slice(4).split("|")
		const arm =
			lib === "arktype" ? "ArkType"
			: lib === "typebox (Value.Check)" ? "TypeBox"
			: lib.startsWith("ata") ? "ata"
			: lib === "valibot (is)" ? "valibot"
			: lib
		return [`${scene}|${body} ${arm}`, median(reps)]
	})
)

const suites = [
	{
		category: "speed",
		id: "moltar",
		label: "moltar's typescript-runtime-type-benchmarks",
		unit: "instructions per call",
		source: sources.counts,
		rows: moltar
	},
	{
		category: "speed",
		id: "homepage",
		label: "the homepage's benchmark",
		unit: "ns per call",
		source: "benchData.json scenarios",
		rows: homepage
	},
	{
		category: "startup",
		id: "startup",
		label: "startup.ts",
		unit: "instructions beyond the baseline",
		source: sources.startup,
		rows: startupRows
	},
	{
		category: "startup",
		id: "homepageStartup",
		label: "the homepage's cold start",
		unit: "ms",
		source: "benchData.json startup",
		rows: appsOf(bench.startup, "coldMs")
	},
	{
		category: "size",
		id: "form",
		label: "valibot.dev's login form",
		unit: "B gzipped",
		source: sources.forms,
		rows: [
			rowOf(
				"login form",
				Object.fromEntries(
					Object.entries(forms).map(([arm, { gzip }]) => [arm, gzip])
				)
			)
		]
	},
	{
		category: "size",
		id: "homepageSize",
		label: "the homepage's apps",
		unit: "B gzipped",
		source: `benchData.json size, ArkType's from ${sources.arkType.join(", ")}`,
		rows: appsOf(homepageSize, "gzip")
	},
	{
		category: "speed",
		id: "sb",
		label: "schemabenchmarks.dev",
		unit: "instructions per call",
		source: sources.sbCounts,
		rows: sbRows(
			sbCounts.filter(([key]) => !key.startsWith("sb initialization"))
		)
	},
	{
		category: "speed",
		id: "sury",
		label: "Sury's schema benchmark",
		unit: "instructions per call",
		source: sources.suryCounts,
		rows: [suryRow("parse", "parse")]
	},
	{
		category: "speed",
		id: "ata",
		label: "ata's validator-benchmarks",
		unit: "instructions per document",
		source: sources.ataCounts,
		rows: ataRows
	},
	{
		category: "startup",
		id: "sbStartup",
		label: "schemabenchmarks.dev's initialization",
		unit: "instructions per call",
		source: sources.sbCounts,
		rows: sbRows(
			sbCounts.filter(([key]) => key.startsWith("sb initialization"))
		)
	},
	{
		category: "startup",
		id: "suryStartup",
		label: "Sury's build and parse once",
		unit: "instructions per call",
		source: sources.suryCounts,
		rows: [suryRow("build", "build")]
	},
	{
		category: "size",
		id: "sbSize",
		label: "schemabenchmarks.dev's download",
		unit: "B gzipped",
		source: sources.sbDownload,
		rows: [
			rowOf(
				"download",
				sbDownload.reduce<Record<string, number>>((byArm, r) => {
					const arm = sbNameOf(sbLabelOf(r))
					byArm[arm] = Math.min(byArm[arm] ?? Infinity, r.gzipBytes)
					return byArm
				}, {})
			)
		]
	},
	{
		category: "size",
		id: "surySize",
		label: "Sury's schema bundled as a check",
		unit: "B gzipped",
		source: sources.surySize,
		rows: [
			rowOf(
				"schema",
				Object.entries(surySize).reduce<Record<string, number>>(
					(byArm, [label, { gzip }]) => {
						const arm = /^(.+) (schema|check)$/.exec(label)?.[1]
						if (arm) byArm[arm] = Math.min(byArm[arm] ?? Infinity, gzip)
						return byArm
					},
					{}
				)
			)
		]
	}
]

const { week, libraries } = read(sources.downloads)
const downloads = {
	week,
	weekly: Object.fromEntries(
		Object.entries(libraries as Record<string, { downloads: number }>).map(
			([library, { downloads }]) => [library, downloads]
		)
	)
}

// when the published rows were last measured: the newest run's latest suite,
// or today for a fresh run
const measured =
	freshDir ?
		new Date().toISOString().slice(0, 10)
	:	Object.values(
			read("results/newest/run.json") as Record<string, { date: string }>
		)
			.map(run => run.date)
			.reduce((l, r) => (l > r ? l : r))

// formatted as the repo's prettier config formats it, so a rewrite passes lint
const out =
	freshDir ?
		join(freshDir, "leaderboard.json")
	:	join(docs, "lib", "bench", "leaderboard.json")
writeFileSync(
	out,
	await format(
		JSON.stringify({ measured, sources, downloads, suites }, null, "\t"),
		{
			...(await resolveConfig(out)),
			filepath: out
		}
	)
)
