// one measured process: warms one moltar case for a second of CPU, then runs it
// in benny's call shape (`() => c.run()` called from a loop function, so the
// case runs in TurboFan code as in moltar's steady state). Counting, it runs
// k * 2M calls between perf's enable and disable; with WALL=1, it times seven
// blocks of 10M calls instead.
// node -r ts-node/register/transpile-only child.ts <moltar> <case> <module> <benchmark> <k>
// <case> is a file in moltar's cases/ or an absolute path, e.g. to cases.ts
const { openSync, readSync, writeSync } = require("node:fs")
const { isAbsolute, join } = require("node:path")

const [root, caseFile, moduleName, benchmark, kArg] = process.argv.slice(2)
const { getRegisteredBenchmarks } = require(join(root, "benchmarks"))
require(isAbsolute(caseFile) ? caseFile : join(root, "cases", caseFile))

const entry = getRegisteredBenchmarks().find(
	([id]: [string]) => id === benchmark
)
const c = entry?.[1].find(
	(c: { moduleName: string }) => c.moduleName === moduleName
)
if (!c) {
	console.log(JSON.stringify({ n: 0 }))
	process.exit()
}
const fn = () => c.run()
const cycle = (count: number) => {
	while (count--) fn()
}
const n = 2_000_000
const per = 10_000
const warmFrom = process.cpuUsage().user
while (process.cpuUsage().user - warmFrom < 1e6) cycle(per)
if (process.env.WALL) {
	const blocks: number[] = []
	for (let b = 0; b < 7; b++) {
		const from = process.hrtime.bigint()
		for (let i = 0; i < (5 * n) / per; i++) cycle(per)
		blocks.push(Number(process.hrtime.bigint() - from) / (5 * n))
	}
	console.log(JSON.stringify({ n, blocks }))
	process.exit()
}
const ctl = openSync(process.env.PERF_CTL, "w")
const ack = openSync(process.env.PERF_ACK, "r")
const perf = (command: string) => {
	writeSync(ctl, `${command}\n`)
	readSync(ack, Buffer.alloc(5))
}
const cycles = (Number(kArg) * n) / per
perf("enable")
for (let i = 0; i < cycles; i++) cycle(per)
perf("disable")
console.log(JSON.stringify({ n }))
process.exit()
