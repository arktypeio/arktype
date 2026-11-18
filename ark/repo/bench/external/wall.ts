// the paired wall-clock run (H): each pass runs every wall arm once, in a
// fresh random order, each in its own process pinned to WALL_CORES (default
// 10-15), and keeps the median of the arm's timed blocks. A pass starts only
// while the 1-minute load is under 4, and records the load at its start and
// end. Resumes from out.json; no pass is ever rerun or dropped.
// node wall.ts <out.json> <passes>
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { loadavg } from "node:os"
import { join } from "node:path"
import { median } from "../stats.ts"
import type { Arm } from "./arms.ts"

const [outPath, passes] = process.argv.slice(2)
const arms: Record<string, Arm> = JSON.parse(
	readFileSync(join(import.meta.dirname, "out/arms.json"), "utf8")
).wall

type Pass = {
	started: string
	load: [start: number, end: number]
	order: string[]
	ns: Record<string, number>
}

const out: { passes: Pass[] } =
	existsSync(outPath) ?
		JSON.parse(readFileSync(outPath, "utf8"))
	:	{ passes: [] }

while (out.passes.length < Number(passes)) {
	while (loadavg()[0] >= 4) {
		console.log(`waiting: load ${loadavg()[0].toFixed(1)}`)
		execFileSync("sleep", ["30"])
	}
	const start = loadavg()[0]
	const started = new Date().toISOString()
	const order = Object.keys(arms)
		.map(label => [Math.random(), label] as const)
		.sort((a, b) => a[0] - b[0])
		.map(([, label]) => label)
	const ns: Record<string, number> = {}
	for (const label of order) {
		const { cwd, node, args } = arms[label]
		const stdout = execFileSync(
			"taskset",
			["-c", process.env.WALL_CORES ?? "10-15", node, ...args, "1"],
			{
				cwd,
				env: { ...process.env, WALL: "1" },
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"]
			}
		)
		ns[label] = median(JSON.parse(stdout.trim().split("\n").pop()!).blocks)
	}
	out.passes.push({ started, load: [start, loadavg()[0]], order, ns })
	writeFileSync(outPath, JSON.stringify(out, null, 1))
	console.log(
		`pass ${out.passes.length} (load ${start.toFixed(1)}-${loadavg()[0].toFixed(1)})`
	)
}
