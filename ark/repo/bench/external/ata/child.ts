// one measured process for ata's validator-benchmarks: builds an adapter as its
// run.mjs worker does (make(lib, body, scene) from the clone's impls), checks
// it answers every document as the scene expects (exits 1 otherwise), warms it
// for a second of CPU, then runs it over the scene's documents k * n / docs
// times between perf's enable and disable, n being about half a second's
// documents (COUNT_N fixes n). count.ts's quotient is instructions per document.
// node child.ts <validator-benchmarks clone> <scene> <body> <lib> <k|check>
import { openSync, readSync, writeSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { scenes } from "./scenes.ts"

const [ata, sceneName, bodyName, lib, k] = process.argv.slice(2)
const load = (path: string) => import(pathToFileURL(join(ata, path)).href)
const { bodies } = await load("bodies/index.mjs")
const { make } = await load("impls/index.mjs")
const sc = scenes[sceneName]
const body = bodies[bodyName]
const docs: unknown[] = body.docs[sc.docs]
const fn = await make(lib, body, sc.scene)
if (!fn) {
	console.log(JSON.stringify({ n: 0 }))
	process.exit()
}
let disagree = 0
for (const d of docs) {
	const r = fn(d)
	const ok =
		sc.scene === "verdict" ? r === (sc.docs === "valid")
		: sc.docs === "valid" ? r === 0
		: r > 0
	if (!ok) disagree++
}
if (k === "check") {
	console.log(JSON.stringify({ disagree }))
	process.exit()
}
if (disagree) {
	console.error(
		`${lib} ${sceneName} ${bodyName}: ${disagree} documents disagree`
	)
	process.exit(1)
}
let sink: unknown
const passes = (count: number) => {
	for (let i = 0; i < count; i++) for (const d of docs) sink = fn(d)
}
// COUNT_WARM_US lengthens the warmup, for bodies whose tiering outlasts a second
const warmUs = Number(process.env.COUNT_WARM_US ?? 1e6)
const warmFrom = process.cpuUsage().user
let warmDocs = 0
while (process.cpuUsage().user - warmFrom < warmUs) {
	passes(1)
	warmDocs += docs.length
}
const perPass = docs.length
const n =
	Number(process.env.COUNT_N ?? 0) ||
	perPass * Math.max(1, Math.round(warmDocs / 2 / perPass))
const ctl = openSync(process.env.PERF_CTL!, "w")
const ack = openSync(process.env.PERF_ACK!, "r")
const perf = (command: string) => {
	writeSync(ctl, `${command}\n`)
	readSync(ack, Buffer.alloc(5))
}
perf("enable")
passes((Number(k) * n) / perPass)
perf("disable")
console.log(JSON.stringify({ n, sink: typeof sink }))
process.exit()
