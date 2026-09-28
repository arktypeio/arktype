// Measures arktype's runtime from a root's built ESM (ark/<pkg>/out). It never
// builds, so run `pnpm build` first.
//
//   pnpm perf [suite...] [--root <dir>] [-n <processes>] [--json <file>]
//   pnpm perf compare <rootA> <rootB> [suite...] [-n <processes>] [--json <file>]
//   pnpm perf snapshot <dir> [--root <dir>]
//
// suites (all by default):
//   init      cold import(): ms, ids in $ark.nodesByRegisteredId, and the nodes
//             and distinct precompilation strings reachable from them
//   create    µs per type: 2,000 distinct objects (default and jitless), 200
//             composites over a 40-type pool, 100 scopes of 20 aliases
//   validate  ns per allows and apply at steady state, over 10 cases
//   memory    registry ids and heap after gc, around 5,000 discarded types
//   bundle    esbuild min and gzip bytes of arktype, @ark/schema, arksets and
//             a minimal app
//
// Every suite but bundle runs in fresh node processes; -n sets how many per
// root (defaults in suites.ts). A root defaults to the repo. `snapshot` copies
// a root's runtime packages (out/, package.json, workspace links) to a
// directory that imports standalone, so a baseline survives rebuilds:
//
//   pnpm perf snapshot /tmp/baseline
//   pnpm perf compare /tmp/baseline . init create validate
//
// compare runs each suite's processes for both roots alternately (ABBA...) so
// drift hits both equally, and treats a process as one sample (validate's is
// the median of its in-process samples). Per metric it prints both medians, B's
// change relative to A with a 95% Hodges–Lehmann interval, and a two-sided
// Mann–Whitney U p-value (normal approximation, tie corrected). A metric that
// is identical in every process is exact, and gets no p-value. Metrics from the
// same processes move together, so a suite's noisy metrics are also tested all
// at once, through each process's geometric mean over them.

import { writeJson } from "@ark/fs"
import { cpus, loadavg } from "node:os"
import { resolve } from "node:path"
import { repoDirs } from "../shared.ts"
import {
	describeRoot,
	rootLabel,
	snapshot,
	verifyStandalone,
	type RootDescription
} from "./roots.ts"
import {
	changeInterval,
	mannWhitney,
	median,
	minimumP,
	summarize,
	type Summary
} from "./stats.ts"
import {
	suiteNames,
	suites,
	type ProcessResult,
	type Suite,
	type SuiteName
} from "./suites.ts"

const args = process.argv.slice(2)

// pnpm runs scripts from the repo root, but paths should be relative to where
// the command was typed
const fromInvocation = (path: string) =>
	resolve(process.env.INIT_CWD ?? process.cwd(), path)

const takeFlag = (name: string): string | undefined => {
	const i = args.indexOf(name)
	if (i === -1) return
	const [, value] = args.splice(i, 2)
	if (value === undefined) throw new Error(`${name} requires a value`)
	return value
}

const jsonFlag = takeFlag("--json")
const jsonPath = jsonFlag && fromInvocation(jsonFlag)
const rootFlag = takeFlag("--root")
const root = rootFlag ? fromInvocation(rootFlag) : repoDirs.root
const countFlag = takeFlag("-n")
const count = countFlag === undefined ? undefined : Number(countFlag)
if (count !== undefined && !(Number.isInteger(count) && count > 0))
	throw new Error(`-n must be a positive integer (was ${countFlag})`)

const parseSuites = (names: string[]): SuiteName[] => {
	const unknown = names.filter(name => !suiteNames.includes(name as SuiteName))
	if (unknown.length) {
		throw new Error(
			`Unknown suite ${unknown.join(", ")} (expected ${suiteNames.join(", ")})`
		)
	}
	return names.length ? (names as SuiteName[]) : suiteNames
}

const machine = {
	node: process.version,
	cpu: cpus()[0]?.model,
	cpus: cpus().length,
	platform: process.platform
}

const processCount = (suite: Suite, mode: "run" | "compare") =>
	suite.deterministic ? 1 : (count ?? suite.processes[mode])

const progress = (message: string) => {
	if (process.stderr.isTTY) process.stderr.write(`\r\x1b[K${message}`)
}

// a process's value for a metric: the value itself, or the median of the
// samples it took
const valueOf = (value: number | number[]) =>
	typeof value === "number" ? value : median(value)

// the samples summarized for a root: its processes' values, or the samples
// taken within its only process
const samplesOf = (processes: ProcessResult[], metric: string): number[] =>
	processes.length === 1 ?
		[processes[0][metric]].flat()
	:	processes.map(p => valueOf(p[metric]))

const describeProcesses = (processes: ProcessResult[]) => {
	const first = Object.values(processes[0])[0]
	const within = Array.isArray(first) ? first.length : 0
	const noun = processes.length === 1 ? "process" : "processes"
	return (
		within ?
			processes.length === 1 ?
				`1 process, ${within} samples`
			:	`${processes.length} ${noun} (each the median of ${within} samples)`
		:	`${processes.length} ${noun}`
	)
}

const formatNumber = (x: number) =>
	Number.isInteger(x) || Math.abs(x) >= 1000 ?
		Math.round(x).toLocaleString("en-US")
	: Math.abs(x) >= 100 ? x.toFixed(1)
	: Math.abs(x) >= 10 ? x.toFixed(2)
	: x.toFixed(3)

const formatChange = (x: number) =>
	`${x < 0 ? "-" : "+"}${Math.abs(x * 100).toFixed(1)}%`

const formatP = (p: number) =>
	p < 0.001 ? "<0.001"
	: p < 0.1 ? p.toFixed(3)
	: p.toFixed(2)

const printTable = (header: string[], rows: string[][]) => {
	const widths = header.map((cell, i) =>
		Math.max(cell.length, ...rows.map(row => row[i].length))
	)
	for (const row of [header, ...rows]) {
		console.log(
			row
				.map((cell, i) =>
					i === 0 ? cell.padEnd(widths[i]) : cell.padStart(widths[i])
				)
				.join("   ")
				.trimEnd()
		)
	}
	console.log()
}

const output: Record<string, unknown> = {
	date: new Date().toISOString(),
	machine,
	suites: {}
}

const record = (name: SuiteName, result: object) => {
	;(output.suites as Record<string, object>)[name] = result
	if (jsonPath) writeJson(jsonPath, output)
}

type Conditions = { seconds: number; load: [start: number, end: number] }

// wall time, and the 1-minute load average when the suite started and ended
const conditionsSince = (start: {
	time: number
	load: number
}): Conditions => ({
	seconds: (performance.now() - start.time) / 1000,
	load: [start.load, loadavg()[0]]
})

const describeConditions = ({ seconds, load }: Conditions) =>
	`${seconds.toFixed(seconds < 10 ? 1 : 0)}s · load ${load[0].toFixed(1)}→${load[1].toFixed(1)}`

const allEqual = (values: number[]) => values.every(v => v === values[0])

// runs a suite's processes for each root in turn, reversing the order every
// round (ABBA...) so that drift and ordering affect every root alike
const measureSuite = async (name: SuiteName, roots: string[], n: number) => {
	const suite: Suite = suites[name]
	const start = { time: performance.now(), load: loadavg()[0] }
	const processes: ProcessResult[][] = roots.map(() => [])
	const measure = async (i: number, round: string) => {
		progress(`${name} ${round}${roots.length > 1 ? ` ${"AB"[i]}` : ""}`)
		const result = await suite.measure(roots[i])
		progress("")
		return result
	}
	if (suite.warmup) for (const i of roots.keys()) await measure(i, "warmup")
	for (let round = 0; round < n; round++) {
		const order = [...roots.keys()]
		if (round % 2) order.reverse()
		for (const i of order)
			processes[i].push(await measure(i, `${round + 1}/${n}`))
	}
	return { processes, conditions: conditionsSince(start) }
}

const run = async (root: string, names: SuiteName[]) => {
	const description = describeRoot(root)
	Object.assign(output, { command: "run", root: description })
	console.log(`${rootLabel(description)}\n`)
	for (const name of names) {
		const suite: Suite = suites[name]
		const {
			processes: [processes],
			conditions
		} = await measureSuite(name, [root], processCount(suite, "run"))

		const summary: Record<string, Summary> = {}
		for (const metric of Object.keys(processes[0]))
			summary[metric] = summarize(samplesOf(processes, metric))
		console.log(
			[
				name,
				suite.deterministic ? "deterministic" : describeProcesses(processes),
				describeConditions(conditions)
			].join(" · ")
		)
		if (Object.values(summary).every(s => s.n === 1)) {
			printTable(
				[name, "value"],
				Object.entries(summary).map(([metric, s]) => [
					metric,
					formatNumber(s.median)
				])
			)
		} else {
			printTable(
				[name, "min", "median", "IQR"],
				Object.entries(summary).map(([metric, s]) => {
					const iqr = s.q3 - s.q1
					return [
						metric,
						formatNumber(s.min),
						formatNumber(s.median),
						iqr === 0 || s.median === 0 ?
							formatNumber(iqr)
						:	`${formatNumber(iqr)} (${((iqr / s.median) * 100).toFixed(1)}%)`
					]
				})
			)
		}
		record(name, { ...conditions, processes, summary })
	}
}

type Comparison = {
	A: Summary
	B: Summary
	/** B's median relative to A's, e.g. -0.1 is 10% lower */
	change: number
	/** identical in every process of each root, so the change is certain */
	exact: boolean
	interval?: [number, number] | undefined
	p?: number | undefined
}

const compareValues = (
	a: number[],
	b: number[],
	deterministic: boolean
): Comparison => {
	const A = summarize(a)
	const B = summarize(b)
	const exact =
		deterministic ||
		(a.length > 1 && b.length > 1 && allEqual(a) && allEqual(b))
	const tested = !exact && a.length > 1 && b.length > 1
	return {
		A,
		B,
		change: B.median / A.median - 1,
		exact,
		p: tested ? mannWhitney(a, b).p : undefined,
		interval: tested ? changeInterval(a, b) : undefined
	}
}

const formatInterval = (c: Comparison) =>
	c.interval ?
		`${formatChange(c.interval[0])} .. ${formatChange(c.interval[1])}`
	:	"-"

const formatSignificance = (c: Comparison) =>
	c.exact ? "exact"
	: c.p === undefined ? "-"
	: formatP(c.p)

/**
 * Every metric of a suite at once: each process's geometric mean over the
 * metrics, each metric relative to its median across both roots. Metrics
 * measured in the same process share its luck, so their p-values rise and
 * fall together, and this, rather than a count of small p-values, says whether
 * the suite as a whole moved.
 */
const compareTogether = (
	metrics: string[],
	processesA: ProcessResult[],
	processesB: ProcessResult[]
): Comparison => {
	const pooled = Object.fromEntries(
		metrics.map(m => [
			m,
			median([...processesA, ...processesB].map(p => valueOf(p[m])))
		])
	)
	const index = (processes: ProcessResult[]) =>
		processes.map(p =>
			Math.exp(
				metrics.reduce(
					(sum, m) => sum + Math.log(valueOf(p[m]) / pooled[m]),
					0
				) / metrics.length
			)
		)
	return compareValues(index(processesA), index(processesB), false)
}

const compare = async (rootA: string, rootB: string, names: SuiteName[]) => {
	const roots: Record<"A" | "B", RootDescription> = {
		A: describeRoot(rootA),
		B: describeRoot(rootB)
	}
	Object.assign(output, { command: "compare", ...roots })
	console.log(`A  ${rootLabel(roots.A)}\nB  ${rootLabel(roots.B)}\n`)
	for (const name of names) {
		const suite: Suite = suites[name]
		const n = processCount(suite, "compare")
		const {
			processes: [processesA, processesB],
			conditions
		} = await measureSuite(name, [rootA, rootB], n)

		// one value per process: samples within a process are not independent
		const comparisons: Record<string, Comparison> = {}
		for (const metric of Object.keys(processesA[0])) {
			comparisons[metric] = compareValues(
				processesA.map(p => valueOf(p[metric])),
				processesB.map(p => valueOf(p[metric])),
				!!suite.deterministic
			)
		}

		const floor = minimumP(n, n)
		console.log(
			[
				name,
				suite.deterministic ? "deterministic" : (
					`${describeProcesses(processesA)} per root, alternating`
				),
				describeConditions(conditions),
				...(suite.deterministic || floor < 0.001 ?
					[]
				:	[`smallest attainable p ${formatP(floor)}`])
			].join(" · ")
		)
		printTable(
			[name, "A median", "B median", "B vs A", "95% CI", "p"],
			Object.entries(comparisons).map(([metric, c]) => [
				metric,
				formatNumber(c.A.median),
				formatNumber(c.B.median),
				Number.isFinite(c.change) ? formatChange(c.change) : "-",
				formatInterval(c),
				formatSignificance(c)
			])
		)

		const tested = Object.keys(comparisons).filter(
			metric => comparisons[metric].p !== undefined
		)
		// a geometric mean needs positive values
		const pooled = tested.filter(metric =>
			[...processesA, ...processesB].every(p => valueOf(p[metric]) > 0)
		)
		const together =
			pooled.length > 1 ?
				compareTogether(pooled, processesA, processesB)
			:	undefined
		if (together) {
			const significant = tested.filter(m => comparisons[m].p! < 0.05).length
			console.log(
				`p < 0.05 for ${significant} of ${tested.length} metrics (${(tested.length * 0.05).toFixed(2)} expected by chance, but metrics sharing processes move together)\n` +
					`all ${pooled.length} together (per-process geometric mean): ${formatChange(together.change)}, 95% CI ${formatInterval(together)}, p ${formatSignificance(together)}\n`
			)
		}
		record(name, {
			...conditions,
			A: processesA,
			B: processesB,
			comparisons,
			together
		})
	}
}

const [command, ...positionals] = args

if (command === "snapshot") {
	if (!positionals[0]) throw new Error("usage: snapshot <dir> [--root <dir>]")
	const dir = fromInvocation(positionals[0])
	snapshot(root, dir)
	const modules = verifyStandalone(dir)
	console.log(
		`Snapshot at ${dir} imports standalone (${modules} modules, all inside it)`
	)
} else if (command === "compare") {
	const [rootA, rootB, ...names] = positionals
	if (!rootA || !rootB)
		throw new Error("usage: compare <rootA> <rootB> [suite...]")
	await compare(
		fromInvocation(rootA),
		fromInvocation(rootB),
		parseSuites(names)
	)
} else await run(root, parseSuites(args))
