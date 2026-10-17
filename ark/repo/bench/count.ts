// counts the instructions each validate.ts arm runs per call, unlike time
// steady under load; Linux with perf, filtered like benchValidate
import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { availableParallelism, tmpdir } from "node:os"
import { join } from "node:path"
import { benchedLibraries, isBenchedCase } from "./libraries.ts"
import { median } from "./stats.ts"

// no background GC or timers, and a big old space, so counts are stable
const nodeArgs = [
	"--single-threaded",
	"--no-memory-reducer",
	"--initial-old-space-size=2048",
	"--conditions",
	"ark-ts",
	join(import.meta.dirname, "validate.ts")
]

const envOf = (vars: Record<string, string>) => ({
	...process.env,
	BENCH_PINNED: "1",
	...vars
})

// listing the cases also rebuilds the standalone validators counts load
const listed = spawnSync(process.execPath, nodeArgs, {
	env: envOf({ BENCH_COUNT: "1" }),
	encoding: "utf8"
})
if (listed.status !== 0) throw new Error(listed.stderr)

const cases = (JSON.parse(listed.stdout) as string[]).filter(isBenchedCase)

const repeats = Number(process.env.BENCH_REPEATS ?? 3)

const fifos = mkdtempSync(join(tmpdir(), "bench-count-"))
let fifoCount = 0

// instructions in k * n calls, and n, which is 0 for an arm the case lacks
const count = (name: string, library: string, k: number) =>
	new Promise<{ instructions: number; n: number }>((resolve, reject) => {
		const ctl = join(fifos, `ctl${fifoCount}`)
		const ack = join(fifos, `ack${fifoCount++}`)
		spawnSync("mkfifo", [ctl, ack])
		const child = spawn(
			"perf",
			[
				"stat",
				"-x,",
				"-e",
				"instructions:u",
				"-D",
				"-1",
				"--control",
				`fifo:${ctl},${ack}`,
				"--",
				process.execPath,
				...nodeArgs
			],
			{
				env: envOf({
					BENCH_COUNT: String(k),
					BENCH_CASE: name,
					BENCH_LIBRARY: library,
					PERF_CTL: ctl,
					PERF_ACK: ack
				})
			}
		)
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", chunk => (stdout += chunk))
		child.stderr.on("data", chunk => (stderr += chunk))
		child.on("close", status => {
			rmSync(ctl)
			rmSync(ack)
			const counted = stderr
				.split("\n")
				.map(line => line.split(","))
				.find(fields => fields[2] === "instructions:u")
			const { n } = JSON.parse(stdout.trim().split("\n").pop() || "{}")
			if (status !== 0 || n === undefined || (n && !Number(counted?.[0])))
				reject(new Error(`${name} ${library}: ${stderr}`))
			else resolve({ instructions: n && Number(counted![0]), n })
		})
	})

const jobs = Array.from({ length: repeats }, (_, repeat) =>
	cases.flatMap(name =>
		(repeat % 2 ? [...benchedLibraries].reverse() : benchedLibraries).map(
			library => ({ name, library })
		)
	)
).flat()

const samples: Record<string, Record<string, number[]>> = {}

// counts over n and 2n calls differ by n calls
const worker = async () => {
	for (let job = jobs.shift(); job; job = jobs.shift()) {
		const once = await count(job.name, job.library, 1)
		if (!once.n) continue
		const twice = await count(job.name, job.library, 2)
		;((samples[job.name] ??= {})[job.library] ??= []).push(
			(twice.instructions - once.instructions) / once.n
		)
		process.stderr.write(".")
	}
}

await Promise.all(
	Array.from(
		{
			length: Number(
				process.env.BENCH_JOBS ?? Math.max(1, availableParallelism() / 2)
			)
		},
		worker
	)
)
process.stderr.write("\n")
rmSync(fifos, { recursive: true })

const out = join(import.meta.dirname, "out")
mkdirSync(out, { recursive: true })
writeFileSync(join(out, "count.json"), JSON.stringify(samples))

const formatCount = (instructions: number) =>
	instructions < 1000 ? instructions.toFixed(0)
	: instructions < 10_000 ? `${(instructions / 1000).toFixed(1)}k`
	: `${(instructions / 1000).toFixed(0)}k`

console.log(
	`instructions per call, the median of ${repeats} counts over 2n calls less n`
)
console.table(
	Object.fromEntries(
		cases.map(name => [
			name,
			Object.fromEntries(
				benchedLibraries
					.filter(library => samples[name]?.[library])
					.map(library => [
						library,
						formatCount(median(samples[name][library]))
					])
			)
		])
	)
)
