import { fork } from "node:child_process"
import { createHash } from "node:crypto"
import { globSync } from "node:fs"
import { availableParallelism } from "node:os"
import { parseArgs } from "node:util"
import type { Observation, Plan, RunResult, Step } from "./historyWorker.ts"

// checks each unit of arktype's suites observes the same thing fresh, twice
// in one process, and after a random sample of other units:
// pnpm testHistory [file...] [--grep text] [--seed n] [--jobs n] [--chain n]
// [--slowest n]

const { values: opts, positionals } = parseArgs({
	options: {
		grep: { type: "string" },
		seed: { type: "string", default: String(Date.now() % 1e6) },
		jobs: {
			type: "string",
			default: String(Math.ceil(availableParallelism() / 2))
		},
		chain: { type: "string", default: "20" },
		slowest: { type: "string", default: "0" }
	},
	allowPositionals: true
})

const seed = Number(opts.seed)
const jobs = Number(opts.jobs)
const chainLength = Number(opts.chain)

const files =
	positionals.length ? positionals : (
		globSync(
			"ark/{fast-check,json-schema,regex,schema,sets,type}/__tests__/**/*.test.ts"
		).sort()
	)

const now = Date.now()

const workerPath = new URL("./historyWorker.ts", import.meta.url)

let workerMs = 0
const msByPlan = new Map<Plan, number>()

const runWorker = (plan: Plan) =>
	new Promise<RunResult>((resolve, reject) => {
		const start = performance.now()
		let stderr = ""
		const worker = fork(workerPath, [String(now)], {
			execArgv: ["--conditions", "ark-ts", "--no-warnings"],
			serialization: "advanced",
			silent: true
		})
		worker.stderr!.on("data", data => (stderr += data))
		worker.once("message", result => {
			const ms = performance.now() - start
			workerMs += ms
			msByPlan.set(plan, ms)
			resolve(result as RunResult)
		})
		// unlike exit, close follows every message
		worker.once("close", code =>
			reject(
				new Error(
					`worker running ${JSON.stringify(plan).slice(0, 500)} exited with ${code}:\n${stderr}`
				)
			)
		)
		worker.send(plan)
	})

const pool = async <t>(tasks: (() => Promise<t>)[]): Promise<t[]> => {
	const results: t[] = []
	let next = 0
	const work = async () => {
		while (next < tasks.length) {
			const i = next++
			results[i] = await tasks[i]()
		}
	}
	await Promise.all(Array.from({ length: jobs }, work))
	return results
}

const start = performance.now()

const { unitsByFile } = await runWorker({ list: files })
const steps: Step[] = Object.entries(unitsByFile).flatMap(([file, units]) =>
	units
		.filter(unit => !opts.grep || unit.includes(opts.grep))
		.map((unit): Step => [unit, file])
)

// ordered by a hash of the seed and each unit, so a seed reproduces a history
const rankByUnit = Object.fromEntries(
	steps.map(([unit]) => [
		unit,
		createHash("sha1").update(`${seed} ${unit}`).digest("hex")
	])
)
const shuffled = [...steps].sort((l, r) =>
	rankByUnit[l[0]] < rankByUnit[r[0]] ? -1 : 1
)

const chains: Step[][] = []
for (let i = 0; i < shuffled.length; i += chainLength)
	chains.push(shuffled.slice(i, i + chainLength))

const freshPlans = steps.map((step): Plan => ({ steps: [step, step] }))

const results = await pool([
	...chains.map(chain => () => runWorker({ steps: chain })),
	...freshPlans.map(plan => () => runWorker(plan))
])

const freshByUnit = Object.fromEntries(
	steps.map(([unit], i) => [unit, results[chains.length + i]])
)

interface Runs {
	fresh: Observation[]
	twice?: Observation[]
	history: Observation[]
	preceding: string[]
}

const runsByUnit: Record<string, Runs> = {}

for (const [i, chain] of chains.entries()) {
	const { logs, loadLogsByFile } = results[i]
	for (const [j, [unit, file]] of chain.entries()) {
		const fresh = freshByUnit[unit]
		const preceding = chain.slice(0, j).map(step => step[0])
		runsByUnit[unit] = {
			fresh: fresh.logs[0],
			twice: fresh.logs[1],
			history: logs[j],
			preceding
		}
		runsByUnit[`${file} › (load)`] ??= {
			fresh: fresh.loadLogsByFile[file],
			history: loadLogsByFile[file],
			preceding
		}
	}
}

const firstDifference = (
	l: unknown,
	r: unknown,
	path: string[] = []
): string[] | undefined => {
	if (typeof l !== "object" || typeof r !== "object" || !l || !r)
		return JSON.stringify(l) === JSON.stringify(r) ? undefined : path
	for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
		const difference = firstDifference(
			(l as Record<string, unknown>)[k],
			(r as Record<string, unknown>)[k],
			[...path, k]
		)
		if (difference) return difference
	}
}

const show = (log: Observation[] | undefined, path: string[]) => {
	let value: unknown = log
	for (const k of path) value = (value as Record<string, unknown>)?.[k]
	const json =
		value === undefined ?
			`(absent from ${JSON.stringify(log?.[Number(path[0])])})`
		:	JSON.stringify(value)
	return json.length > 300 ? `${json.slice(0, 300)}…` : json
}

// units whose differences are allowed to depend on history, by why
const skippedUnits: Record<string, string> = {
	"ark/type/__tests__/gc.test.ts › gc › values captured by functions":
		"collection depends on what was compiled before"
}

const staleSkips = Object.keys(skippedUnits).filter(unit => {
	const file = unit.slice(0, unit.indexOf(" › "))
	return files.includes(file) && !unitsByFile[file]?.includes(unit)
})

let violations = 0
const failing: string[] = []

for (const unit of Object.keys(runsByUnit).sort()) {
	const runs = runsByUnit[unit]
	if (runs.fresh[runs.fresh.length - 1]?.outcome !== "pass") failing.push(unit)
	if (unit in skippedUnits) continue
	const differences = (["twice", "history"] as const).flatMap(name => {
		const path = runs[name] && firstDifference(runs.fresh, runs[name])
		return path ? [[name, path] as const] : []
	})
	if (!differences.length) continue
	violations++
	console.log(`\n✗ ${unit}`)
	for (const [name, path] of differences) {
		console.log(`  ${name} differs at ${path.join(" › ")}`)
		for (const run of ["fresh", "twice", "history"] as const)
			console.log(`    ${run}: ${show(runs[run], path)}`)
	}
	if (differences.some(([name]) => name === "history")) {
		console.log(
			`  history (seed ${seed}) ran after: ${runs.preceding.join("; ") || "(nothing)"}`
		)
	}
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

const slowest = Number(opts.slowest)
if (slowest) {
	const msOf = (i: number) => msByPlan.get(freshPlans[i])!
	console.log("\nslowest units, run twice in a fresh process:")
	for (const i of [...steps.keys()]
		.sort((l, r) => msOf(r) - msOf(l))
		.slice(0, slowest))
		console.log(`  ${seconds(msOf(i))} ${steps[i][0]}`)
}

console.log(
	`\n${violations ? "❌" : "✅"} ${steps.length} units in ${files.length} files, ${violations} history-dependent, ${Object.keys(skippedUnits).length} skipped (seed ${seed}, ${seconds(performance.now() - start)}, ${seconds(workerMs)} across workers)`
)
if (failing.length) {
	console.log(
		`⚠️  ${failing.length} fail even in a fresh process:\n${failing.join("\n")}`
	)
}
if (staleSkips.length)
	console.log(`❌ skipped units that don't exist:\n${staleSkips.join("\n")}`)
if (violations || failing.length || staleSkips.length) process.exitCode = 1
