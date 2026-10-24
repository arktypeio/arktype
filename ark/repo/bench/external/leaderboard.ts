// gathers every row of the suites the README's "Best average" lists into
// ark/docs/lib/bench/leaderboard.json, each library under one name and
// ArkType only as its default production build; lib/claims.ts averages them
// node leaderboard.ts
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const here = import.meta.dirname
const docs = join(here, "..", "..", "..", "docs")

// the stored results each suite reads
const sources = {
	counts: "results/counts-a306152ce.json",
	startup: "results/startup-4fd880692-node24.json",
	forms: "results/forms-642b4517e.json"
}

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"))

const median = (values: readonly number[]) => {
	const sorted = [...values].sort((l, r) => l - r)
	const middle = sorted.length >> 1
	return sorted.length % 2 ?
			sorted[middle]
		:	(sorted[middle - 1] + sorted[middle]) / 2
}

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
	"ajv (standalone, ajv-errors)": "ajv"
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
		;(cases[id] ??= {})[arm] = value
	}
	return Object.entries(cases).map(([id, byArm]) => rowOf(id, byArm))
}

const counts: Record<string, number[]> = read(join(here, sources.counts))
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

const startup = read(join(here, sources.startup))
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

const forms: Record<string, { gzip: number }> = read(join(here, sources.forms))

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
		source: "benchData.json size",
		rows: appsOf(bench.size, "gzip")
	}
]

writeFileSync(
	join(docs, "lib", "bench", "leaderboard.json"),
	`${JSON.stringify({ sources, suites }, null, "\t")}\n`
)
