// one measured process: loads a bundle from bundle.ts and warms its validation
// of schema-benchmarks' valid or invalid data for a second of CPU. Counting, it
// runs it k * n times between perf's enable and disable, n being half a
// second's calls (COUNT_N fixes n); with WALL=1, it times five blocks of n.
// The calls go through a loop function called in cycles, as tinybench calls
// each task, so the case runs in TurboFan code.
// node child.ts <bundle.mjs> <valid|invalid> <k>
import { openSync, readSync, writeSync } from "node:fs"
import { errorData, successData } from "./out/data.mjs"

const [bundlePath, dataType, k] = process.argv.slice(2)
const { default: config } = await import(bundlePath)
const data = dataType === "valid" ? successData : errorData

let sink: unknown
const cycle = (count: number) => {
	while (count--) sink = config.validation.run(data)
}
const blocks = (count: number) => {
	for (let i = 0; i < count; i++) cycle(100)
}
const warmFrom = process.cpuUsage().user
let warmCalls = 0
while (process.cpuUsage().user - warmFrom < 1e6) {
	blocks(10)
	warmCalls += 1000
}
const n = Number(
	process.env.COUNT_N ??
		100 * Math.max(2, Math.min(2000, Math.round(warmCalls / 200)))
)
if (process.env.WALL) {
	const times: number[] = []
	for (let b = 0; b < 5; b++) {
		const from = process.hrtime.bigint()
		blocks(n / 100)
		times.push(Number(process.hrtime.bigint() - from) / n)
	}
	console.log(JSON.stringify({ n, blocks: times, sink: typeof sink }))
	process.exit()
}
const ctl = openSync(process.env.PERF_CTL!, "w")
const ack = openSync(process.env.PERF_ACK!, "r")
const perf = (command: string) => {
	writeSync(ctl, `${command}\n`)
	readSync(ack, Buffer.alloc(5))
}
perf("enable")
blocks((Number(k) * n) / 100)
perf("disable")
console.log(JSON.stringify({ n, sink: typeof sink }))
process.exit()
