// instructions per call of each count arm (C1): perf's count over 2n calls
// minus its count over n, so startup and warmup cancel. Pinned to COUNT_CORES
// (default 10-15); resumes from out.json. COUNT_ARMS names another arms file,
// as sb/allArms.ts writes
// node count.ts <out.json> <reps> [concurrency]
import { spawn, spawnSync } from "node:child_process"
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"
import type { Arm } from "./arms.ts"

const [outPath, reps, concurrency = "3"] = process.argv.slice(2)
const here = import.meta.dirname
const arms: Record<string, Arm> = JSON.parse(
	readFileSync(process.env.COUNT_ARMS ?? join(here, "out/arms.json"), "utf8")
).count
// no background GC or timers, and a big old space, so counts are stable
const nodeArgs = [
	"--single-threaded",
	"--no-memory-reducer",
	"--initial-old-space-size=2048"
]
const fifos = mkdtempSync(join(here, "out", "fifo-"))
let fifoCount = 0

const countOf = (arm: Arm, k: number, n?: number) =>
	new Promise<{ instructions: number; n: number }>((resolve, reject) => {
		const id = fifoCount++
		const ctl = join(fifos, `ctl${id}`)
		const ack = join(fifos, `ack${id}`)
		spawnSync("mkfifo", [ctl, ack])
		const child = spawn(
			"taskset",
			[
				"-c",
				process.env.COUNT_CORES ?? "10-15",
				"perf",
				"stat",
				"-x,",
				"-e",
				"instructions:u",
				"-D",
				"-1",
				"--control",
				`fifo:${ctl},${ack}`,
				"--",
				arm.node,
				...nodeArgs,
				...arm.args,
				String(k)
			],
			{
				cwd: arm.cwd,
				env: {
					...process.env,
					PERF_CTL: ctl,
					PERF_ACK: ack,
					...(n && { COUNT_N: String(n) })
				}
			}
		)
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", chunk => (stdout += chunk))
		child.stderr.on("data", chunk => (stderr += chunk))
		child.on("close", status => {
			rmSync(ctl, { force: true })
			rmSync(ack, { force: true })
			if (status !== 0) return reject(new Error(stderr.slice(-1500)))
			const { n } = JSON.parse(stdout.trim().split("\n").pop()!)
			const line = stderr
				.split("\n")
				.find(line => line.split(",")[2] === "instructions:u")
			if (n && !line) return reject(new Error(`no count: ${stderr}`))
			resolve({ instructions: n ? Number(line!.split(",")[0]) : 0, n })
		})
	})

const samples: Record<string, number[]> =
	existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {}
const jobs: string[] = []
for (let rep = 0; rep < Number(reps); rep++) {
	const labels = Object.keys(arms)
	for (const label of rep % 2 ? labels.reverse() : labels)
		if ((samples[label]?.length ?? 0) <= rep) jobs.push(label)
}
const worker = async () => {
	for (let label = jobs.shift(); label; label = jobs.shift()) {
		try {
			const once = await countOf(arms[label], 1)
			if (!once.n) throw new Error("no such case")
			const twice = await countOf(arms[label], 2, once.n)
			;(samples[label] ??= []).push(
				(twice.instructions - once.instructions) / once.n
			)
			writeFileSync(outPath, JSON.stringify(samples, null, 1))
			console.log(
				`${label}: ${samples[label][samples[label].length - 1].toFixed(1)}`
			)
		} catch (e) {
			console.log(`${label} failed: ${String(e).slice(0, 600)}`)
		}
	}
}
await Promise.all(Array.from({ length: Number(concurrency) }, worker))
rmSync(fifos, { recursive: true, force: true })
