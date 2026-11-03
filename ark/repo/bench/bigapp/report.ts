// prints a stored bigapp result, its standing against rivals and against
// results/baseline.json: node report.ts <result.json> [baseline.json]
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { median, quantile, signTest } from "../stats.ts"

type Samples = Record<string, number[]>

interface Arm {
	bytes: { raw: number; min: number; gz: number }
	samples: Samples
}

interface Stored {
	commit: string
	rounds: number
	loads: number[]
	arms: Record<string, Arm>
}

const kb = (n: number) => `${(n / 1e3).toFixed(0)}K`
const giga = (n: number) => `${(n / 1e9).toFixed(3)}G`
const number = (n: number) => n.toFixed(n < 10 ? 2 : 0)
const spread = (xs: number[], format: (n: number) => string) =>
	`${format(median(xs))} (${format(quantile(xs, 0.25))}-${format(quantile(xs, 0.75))})`

const row = (arm: Arm) => ({
	raw: kb(arm.bytes.raw),
	min: kb(arm.bytes.min),
	gz: kb(arm.bytes.gz),
	"import ms": spread(arm.samples.importMs, number),
	"import instr": spread(arm.samples.importInstructions, giga),
	"to first validation": spread(arm.samples.firstInstructions, giga),
	"first use ms": spread(arm.samples.firstMs, number),
	"hot ns": spread(arm.samples.hotNs, number)
})

const armsOf = (stored: Stored, group: string) =>
	Object.entries(stored.arms)
		.filter(
			([name]) =>
				name.startsWith(`${group} `) &&
				!name.slice(group.length + 1).startsWith("narrows")
		)
		.map(([name, arm]) => [name.slice(group.length + 1), arm] as const)

// precompiled against each rival, paired by round
const standing = (stored: Stored, group: string) => {
	const ours = stored.arms[`${group} precompiled`]
	return Object.fromEntries(
		armsOf(stored, group)
			.filter(
				([name]) => !name.includes("precompiled") && !name.endsWith("raw")
			)
			.map(([name, theirs]) => {
				const versus = (metric: string) =>
					`${(median(ours.samples[metric]) / median(theirs.samples[metric])).toFixed(2)}x p${signTest(ours.samples[metric], theirs.samples[metric]).toFixed(3)}`
				return [
					`vs ${name}`,
					{
						gz: `${(ours.bytes.gz / theirs.bytes.gz).toFixed(2)}x`,
						"import instr": versus("importInstructions"),
						"to first": versus("firstInstructions"),
						"import ms": versus("importMs"),
						"hot ns": versus("hotNs")
					}
				]
			})
	)
}

const groupsOf = (stored: Stored) => [
	...new Set(
		Object.keys(stored.arms).map(name => name.replace(/ [^ ]+( raw)?$/, ""))
	)
]

// by size, precompiled / each rival: under 1 is a win
const crossover = (stored: Stored) => {
	const sized = groupsOf(stored).filter(group => /^\d/.test(group))
	if (!sized.length) return
	const rivals = ["zod", "valibot", "arktype"]
	const metrics: [string, (arm: Arm) => number[]][] = [
		["gz", arm => [arm.bytes.gz]],
		["import", arm => arm.samples.importInstructions],
		["to first", arm => arm.samples.firstInstructions]
	]
	for (const narrows of [false, true]) {
		console.log(
			`\nprecompiled / rival, ${narrows ? "with" : "without"} narrows; under 1 wins, * unsure at p 0.05`
		)
		console.table(
			Object.fromEntries(
				sized
					.filter(group => group.includes("narrows") === narrows)
					.map(group => {
						const ours = stored.arms[`${group} precompiled`]
						const cells: Record<string, string> = {}
						for (const rival of rivals) {
							const theirs = stored.arms[`${group} ${rival}`]
							for (const [metric, of] of metrics) {
								const [l, r] = [of(ours), of(theirs)]
								const unsure = l.length > 1 && signTest(l, r) >= 0.05
								cells[`${rival} ${metric}`] =
									`${(median(l) / median(r)).toFixed(2)}${unsure ? "*" : ""}`
							}
						}
						return [group.split(" ")[0], cells]
					})
			)
		)
	}
}

export const report = (path: string, baselinePath?: string) => {
	const stored: Stored = JSON.parse(readFileSync(path, "utf8"))
	console.log(
		`${stored.commit}: ${stored.rounds} rounds, 1-minute load ${Math.min(...stored.loads).toFixed(1)}-${Math.max(...stored.loads).toFixed(1)}. Medians (IQR), instructions windowed`
	)
	for (const group of groupsOf(stored)) {
		console.log(`\n${group}`)
		console.table(
			Object.fromEntries(armsOf(stored, group).map(([n, a]) => [n, row(a)]))
		)
		console.table(standing(stored, group))
	}
	crossover(stored)
	const base =
		baselinePath ?? join(import.meta.dirname, "results", "baseline.json")
	if (!existsSync(base) || resolve(base) === resolve(path)) return
	const baseline: Stored = JSON.parse(readFileSync(base, "utf8"))
	console.log(`\nagainst baseline ${baseline.commit}: this / baseline`)
	const ratio = (now: number, then: number) => `${(now / then).toFixed(3)}x`
	console.table(
		Object.fromEntries(
			Object.entries(stored.arms)
				.filter(([name]) => baseline.arms[name])
				.map(([name, arm]) => {
					const then = baseline.arms[name]
					const m = (metric: string) =>
						ratio(median(arm.samples[metric]), median(then.samples[metric]))
					return [
						name,
						{
							gz: ratio(arm.bytes.gz, then.bytes.gz),
							raw: ratio(arm.bytes.raw, then.bytes.raw),
							"import instr": m("importInstructions"),
							"to first": m("firstInstructions"),
							"import ms": m("importMs"),
							"hot ns": m("hotNs")
						}
					]
				})
		)
	)
}

if (process.argv[1] === import.meta.filename)
	report(process.argv[2], process.argv[3])
