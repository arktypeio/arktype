// one measured process for any schema-benchmarks library and case, as its
// bench/src/scripts/bench/library.ts registers them: loads the library from the
// clone's built schemas (schemas/dist), warms the case for a second of CPU,
// then runs it k * n times between perf's enable and disable, n being half a
// second's calls (COUNT_N fixes n). The calls go through a loop function
// called in cycles, as tinybench calls each task; a case whose run returns a
// promise is awaited call by call, as tinybench awaits it.
// node allChild.ts <schema-benchmarks clone> <library key> <case|list|check> <k>
import { openSync, readSync, writeSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const [sb, library, caseKey, k] = process.argv.slice(2)
const load = (path: string) => import(pathToFileURL(join(sb, path)).href)
const { errorData, successData, validStrings, invalidStrings } = await load(
	"schemas/src/index.ts"
)
const { libraries } = await load("schemas/dist/index.mjs")
const config = await libraries[library]()

const ensureArray = <t>(v: t | t[]): t[] => (Array.isArray(v) ? v : [v])
const label = (c: { note?: string }) =>
	c.note ? `${config.library.name} (${c.note})` : config.library.name

// every case keyed type|dataType|variant|label, with what a correct run returns
type Case = { run: () => unknown; expect?: (result: unknown) => boolean }
const cases: Record<string, Case> = {}
const bigint = 1_234_567_890_123_456_789n
for (const c of ensureArray(config.initialization ?? []) as any[])
	cases[`initialization|||${label(c)}`] = { run: () => c.run() }
for (const [dataType, data] of [
	["valid", successData],
	["invalid", errorData]
] as const) {
	const valid = dataType === "valid"
	for (const c of ensureArray(config.validation ?? []) as any[]) {
		cases[`validation|${dataType}||${label(c)}`] = {
			run: () => c.run(data),
			expect: result => result === valid
		}
	}
	for (const [errorType, cs] of Object.entries(config.parsing ?? {})) {
		for (const c of ensureArray(cs as object) as any[]) {
			cases[`parsing|${dataType}|${errorType}|${label(c)}`] = {
				run: () => c.run(data),
				expect: result => !!c.validateResult(result) === valid
			}
		}
	}
	for (const [errorType, cs] of Object.entries(config.standard ?? {})) {
		for (const c of ensureArray(cs as object) as any[]) {
			cases[`standard|${dataType}|${errorType}|${label(c)}`] = {
				run: () => c.schema["~standard"].validate(data),
				expect: result => !(result as any).issues === valid
			}
		}
	}
}
for (const [dataType, data] of [
	["valid", validStrings],
	["invalid", invalidStrings]
] as const) {
	for (const [format, cs] of Object.entries(config.string ?? {})) {
		for (const c of ensureArray(cs as object) as any[]) {
			let run: ((s: string) => unknown) | undefined
			cases[`string|${dataType}|${format}|${label(c)}`] = {
				run: () => (run ??= c.create())(data[format])
			}
		}
	}
}
for (const c of ensureArray(config.codec ?? []) as any[]) {
	cases[`codec|encode||${label(c)}`] = {
		run: () => c.encode.run(bigint),
		expect: result => result === bigint.toString()
	}
	cases[`codec|decode||${label(c)}`] = {
		run: () => c.decode.run(bigint.toString()),
		expect: result => result === bigint
	}
}

const isThenable = (v: unknown) => typeof (v as any)?.then === "function"
// a run that throws (a library's assert on invalid data) counts its throw, as
// tinybench's would; settles a promise the same way
const settle = async (run: () => unknown) => {
	try {
		return { result: await run() }
	} catch (error) {
		return { error }
	}
}

if (caseKey === "list") {
	console.log(JSON.stringify(Object.keys(cases)))
	process.exit()
}
if (caseKey === "check") {
	// every case's first result, so a run checks before any count
	const report: Record<string, string> = {}
	for (const [key, c] of Object.entries(cases)) {
		const settled = await settle(c.run)
		report[key] =
			"error" in settled ? `throws ${String(settled.error).slice(0, 60)}`
			: c.expect ?
				c.expect(settled.result) ?
					"ok"
				:	"WRONG"
			:	"ran"
	}
	console.log(JSON.stringify(report))
	process.exit()
}

const c = cases[caseKey]
if (!c) {
	console.log(JSON.stringify({ n: 0 }))
	process.exit()
}
const first = await settle(c.run)
const isAsync = "result" in first && isThenable(c.run())
const throws = "error" in first
let sink: unknown
const syncCycle = (count: number) => {
	if (throws) {
		while (count--) {
			try {
				sink = c.run()
			} catch (e) {
				sink = e
			}
		}
	} else while (count--) sink = c.run()
}
const asyncCycle = async (count: number) => {
	while (count--) sink = await c.run()
}
const blocks = async (count: number) => {
	for (let i = 0; i < count; i++) {
		if (isAsync) await asyncCycle(100)
		else syncCycle(100)
	}
}
const warmFrom = process.cpuUsage().user
let warmCalls = 0
while (process.cpuUsage().user - warmFrom < 1e6) {
	await blocks(10)
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
await blocks((Number(k) * n) / 100)
perf("disable")
console.log(JSON.stringify({ n, sink: typeof sink }))
process.exit()
