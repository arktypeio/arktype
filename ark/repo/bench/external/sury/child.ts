// one measured process for a Sury schema-benchmark case: loads a bundle from
// bundle.ts, warms the case for a second of CPU, then runs it k * n times
// between perf's enable and disable, n being half a second's calls (COUNT_N
// fixes n). Its timeNs calls the case in a plain loop; so does this.
// node child.ts <bundle.mjs> <case> <k>
import { openSync, readSync, writeSync } from "node:fs"

const [bundlePath, caseKey, k] = process.argv.slice(2)
const { cases } = await import(bundlePath)
const run: () => unknown = cases[caseKey]
if (!run) {
	console.log(JSON.stringify({ n: 0 }))
	process.exit()
}
let sink: unknown
const loop = (count: number) => {
	for (let i = 0; i < count; i++) sink = run()
}
const warmFrom = process.cpuUsage().user
let warmCalls = 0
while (process.cpuUsage().user - warmFrom < 1e6) {
	loop(1000)
	warmCalls += 1000
}
const n = Number(
	process.env.COUNT_N ??
		100 * Math.max(2, Math.min(2000, Math.round(warmCalls / 200)))
)
const ctl = openSync(process.env.PERF_CTL!, "w")
const ack = openSync(process.env.PERF_ACK!, "r")
const perf = (command: string) => {
	writeSync(ctl, `${command}\n`)
	readSync(ack, Buffer.alloc(5))
}
perf("enable")
loop(Number(k) * n)
perf("disable")
console.log(JSON.stringify({ n, sink: typeof sink }))
process.exit()
