// The standing measure of what a large app's output costs, precompiled and not,
// against its rivals: ntwine's packages/shared (ntwine.ts) and the benchBuildTime
// apps generated at each size, with and without narrows.
//
// Bundles as a server does (esbuild, esm, node, production). Every arm runs in
// fresh processes, once per mode per round, one at a time, in an order rotating
// by round so arms pair. Counts are perf's instructions:u in a window opened just
// before the import, so nothing the harness does at startup can enter them:
//   import  closes after the import, also timed
//   first   closes after the first validation, whose ms it also times, then
//           measures ns per later (hot) validation
//
// node measure.ts [ntwine] [scale] [crossover] [board] [--rounds=9] [--out=<file>]
//   [--board=<file>]
// board measures board.ts's arms and sizes, with its groups through webpack as
// well, and writes its scoreboard to <file>.
// With no scope, ntwine and scale at 11, 92 and 1012 Types. crossover adds more
// sizes.
// Run `pnpm build` first. Reports against results/baseline.json.
import { spawn, execSync, spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { loadavg } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { sizes, writeAjvApp, writeApp, type Library } from "./apps.ts"
import { boardSizes, writeBoard } from "./board.ts"
import { bundle, type Bundled } from "./bundle.ts"
import { ntwineArms, ntwineThread } from "./ntwine.ts"

const args = process.argv.slice(2)
const flag = (name: string) =>
	args.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1]
const scopes = args.filter(arg => !arg.startsWith("--"))
const rounds = Number(flag("rounds") ?? 9)
const crossover = scopes.includes("crossover")
const board = scopes.includes("board")
const ntwineOn = !scopes.length || scopes.includes("ntwine") || board
const scaleOn = !scopes.length || scopes.includes("scale") || crossover || board
const scaleSizes =
	board ? boardSizes
	: crossover ? Object.keys(sizes).map(Number)
	: [11, 92, 1012]

const here = import.meta.dirname
const out = join(here, "out")
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

// dirty if what's shipped differs from the commit
const commit = () => {
	const sha = execSync("git rev-parse --short=9 HEAD", {
		encoding: "utf8"
	}).trim()
	const dirty = execSync("git status --porcelain", {
		encoding: "utf8",
		cwd: here
	})
		.split("\n")
		.some(line => /^.. ark\/(aot|fs|regex|schema|sets|type|util)\//.test(line))
	return dirty ? `${sha}-dirty` : sha
}

type Call = "arktype" | "zod" | "handler"

interface Arm {
	name: string
	group: string
	library: string
	path: string
	bytes: { raw: number; min: number; gz: number }
	call: Call
	validator: string
	data: unknown
}

const arms: Arm[] = []

// every bundle's path has the same length, as startup.ts explains
const add = (arm: Omit<Arm, "path">, code: string) => {
	const path = join(out, `arm${String(arms.length).padStart(3, "0")}.js`)
	writeFileSync(path, code)
	arms.push({ ...arm, path })
}

interface Built extends Omit<Bundled, "minify"> {
	runRaw?: boolean
	group: string
	library: string
	call: Call
	validator: string
	data: unknown
}

const addBuilt = async (b: Built) => {
	const raw = await bundle({ ...b, minify: false })
	const min = await bundle({ ...b, minify: true })
	const bytes = {
		raw: Buffer.byteLength(raw),
		min: Buffer.byteLength(min),
		gz: gzipSync(min).length
	}
	const arm = {
		group: b.group,
		library: b.library,
		bytes,
		call: b.call,
		validator: b.validator,
		data: b.data
	}
	add({ ...arm, name: `${b.group} ${b.library}` }, min)
	if (b.runRaw) add({ ...arm, name: `${b.group} ${b.library} raw` }, raw)
	console.error(`built ${b.group} ${b.library}: ${bytes.gz} gz`)
}

if (ntwineOn) {
	const arms = ntwineArms(join(out, "ntwine"))
	const common = {
		group: "ntwine",
		validator: "ThreadView",
		data: ntwineThread,
		runRaw: !board
	}
	await addBuilt({
		...common,
		...arms.arktype,
		library: "precompiled",
		call: "arktype"
	})
	if (board) {
		await addBuilt({
			...common,
			...arms.arktype,
			precompiled: { ...arms.arktype.precompiled, preset: "smallest" },
			library: "smallest",
			call: "arktype"
		})
		await addBuilt({
			...common,
			...arms.zodCompiled,
			library: "zodCompiled",
			call: "zod"
		})
	}
	await addBuilt({
		...common,
		...arms.arktype,
		precompiled: undefined,
		library: "arktype",
		call: "arktype"
	})
	await addBuilt({ ...common, ...arms.zod, library: "zod", call: "zod" })
	await addBuilt({ ...common, ...arms.zod3, library: "zod3", call: "zod" })
}

if (ntwineOn && board) {
	const arms = ntwineArms(join(out, "ntwine"))
	const common = {
		group: "webpack ntwine",
		validator: "ThreadView",
		data: ntwineThread,
		webpack: true
	}
	await addBuilt({
		...common,
		...arms.arktype,
		library: "precompiled",
		call: "arktype"
	})
	await addBuilt({
		...common,
		...arms.arktype,
		precompiled: { ...arms.arktype.precompiled, preset: "smallest" },
		library: "smallest",
		call: "arktype"
	})
	await addBuilt({ ...common, ...arms.zod, library: "zod", call: "zod" })
	await addBuilt({ ...common, ...arms.zod3, library: "zod3", call: "zod" })
}

const project = {
	id: "1f0c3a52-7b1e-4c5d-9a8b-2e3f4a5b6c7d",
	orgId: "1f0c3a52-7b1e-4c5d-9a8b-2e3f4a5b6c7d",
	slug: "ark-type",
	name: "ArkType",
	description: "Validators",
	visibility: "public",
	archived: false,
	tags: ["release"],
	createdAt: "2026-10-09T12:00:00.000Z"
}

for (const types of scaleOn ? scaleSizes : []) {
	for (const narrows of [false, true]) {
		const group = `${types}${narrows ? " narrows" : ""}`
		const app = (library: Library) => {
			const dir = join(out, "apps", `${types}-${narrows}-${library}`)
			return { dir, entry: writeApp(types, library, narrows, dir) }
		}
		const common = {
			group,
			call: "handler" as const,
			validator: "checkProject",
			data: project
		}
		const arktype = app("arktype")
		await addBuilt({
			...common,
			library: "precompiled",
			entry: arktype.entry,
			cwd: arktype.dir,
			precompiled: {}
		})
		await addBuilt({
			...common,
			library: "arktype",
			entry: arktype.entry,
			cwd: arktype.dir
		})
		for (const library of ["zod", "valibot"] as const) {
			const { dir, entry } = app(library)
			await addBuilt({ ...common, library, entry, cwd: dir })
			if (board && library === "zod") {
				const compiled = join(dir, "zodCompiled.ts")
				writeFileSync(
					compiled,
					`import "zod/compile"\nexport * from "./index.ts"`
				)
				await addBuilt({
					...common,
					library: "zodCompiled",
					entry: compiled,
					cwd: dir
				})
			}
		}
		if (board) {
			await addBuilt({
				...common,
				library: "smallest",
				entry: arktype.entry,
				cwd: arktype.dir,
				precompiled: { preset: "smallest" }
			})
			if (!narrows) {
				const dir = join(out, "apps", `${types}-ajv`)
				await addBuilt({
					...common,
					library: "ajv",
					entry: await writeAjvApp(types, dir),
					cwd: dir
				})
			}
			const through = { ...common, group: `webpack ${group}`, webpack: true }
			await addBuilt({
				...through,
				library: "precompiled",
				entry: arktype.entry,
				cwd: arktype.dir,
				precompiled: {}
			})
			await addBuilt({
				...through,
				library: "smallest",
				entry: arktype.entry,
				cwd: arktype.dir,
				precompiled: { preset: "smallest" }
			})
			for (const library of ["zod", "valibot"] as const) {
				const dir = join(out, "apps", `${types}-${narrows}-${library}`)
				await addBuilt({
					...through,
					library,
					entry: join(dir, "index.ts"),
					cwd: dir
				})
			}
		}
		rmSync(join(out, "apps"), { recursive: true, force: true })
	}
}

const child = `
import { openSync, readSync, writeSync } from "node:fs"
const { BIGAPP_MODE: mode, BIGAPP_URL: url, BIGAPP_CALL: call, BIGAPP_VALIDATOR: name } = process.env
const data = JSON.parse(process.env.BIGAPP_DATA)
const ctl = openSync(process.env.PERF_CTL, "w")
const ack = openSync(process.env.PERF_ACK, "r")
const perf = command => {
	writeSync(ctl, command + "\\n")
	readSync(ack, Buffer.alloc(5))
}
perf("enable")
const from = performance.now()
const m = await import(url)
const imported = performance.now()
if (mode === "import") {
	perf("disable")
	console.log(JSON.stringify({ importMs: imported - from }))
	process.exit(0)
}
const validate = call === "zod" ? d => m[name].safeParse(d) : m[name]
const check = out => {
	if (call === "zod" ? !out.success : call === "handler" ? !("data" in out) : typeof out?.summary === "string")
		throw new Error("invalid: " + JSON.stringify(out))
}
const started = performance.now()
const out = validate(data)
const firstMs = performance.now() - started
perf("disable")
check(out)
let sink
const until = t => {
	let n = 0
	while (performance.now() < t) {
		for (let i = 0; i < 256; i++) sink = validate(data)
		n += 256
	}
	return n
}
until(performance.now() + 100)
const hotFrom = performance.now()
const hotCalls = until(hotFrom + 100)
const hotNs = ((performance.now() - hotFrom) * 1e6) / hotCalls
check(sink)
console.log(JSON.stringify({ importMs: imported - from, firstMs, hotNs }))`

const env = { ...process.env }
// the repo's ts runner resolves arktype to its sources through NODE_OPTIONS
delete env.NODE_OPTIONS
delete env.NODE_COMPILE_CACHE

const fifos = mkdtempSync(join(out, "fifo-"))
let fifoCount = 0

type Mode = "import" | "first"

const run = (arm: Arm, mode: Mode) =>
	new Promise<{ instructions: number; output: any }>((resolve, reject) => {
		const id = fifoCount++
		const ctl = join(fifos, `ctl${id}`)
		const ack = join(fifos, `ack${id}`)
		spawnSync("mkfifo", [ctl, ack])
		const command = [
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
			process.execPath,
			"--input-type=module",
			"--eval",
			child
		]
		const proc = spawn(command[0], command.slice(1), {
			cwd: "/",
			env: {
				...env,
				BIGAPP_MODE: mode,
				BIGAPP_URL: `file://${arm.path}`,
				BIGAPP_CALL: arm.call,
				BIGAPP_VALIDATOR: arm.validator,
				BIGAPP_DATA: JSON.stringify(arm.data),
				PERF_CTL: ctl,
				PERF_ACK: ack
			}
		})
		let stdout = ""
		let stderr = ""
		proc.stdout.on("data", chunk => (stdout += chunk))
		proc.stderr.on("data", chunk => (stderr += chunk))
		proc.on("close", status => {
			rmSync(ctl, { force: true })
			rmSync(ack, { force: true })
			if (status !== 0) return reject(new Error(`${arm.name}: ${stderr}`))
			const line = stderr
				.split("\n")
				.map(line => line.split(","))
				.find(fields => fields[2] === "instructions:u")
			if (!line) return reject(new Error(`${arm.name}: ${stderr}`))
			resolve({ instructions: Number(line[0]), output: JSON.parse(stdout) })
		})
	})

const metrics = [
	"importInstructions",
	"firstInstructions",
	"importMs",
	"firstMs",
	"hotNs"
] as const

type Metric = (typeof metrics)[number]

type Samples = Record<Metric, number[]>

const samples: Record<string, Samples> = Object.fromEntries(
	arms.map(arm => [
		arm.name,
		Object.fromEntries(metrics.map(metric => [metric, []])) as never
	])
)
const loads: number[] = []

const modes: Mode[] = ["import", "first"]
for (let round = 0; round < rounds; round++) {
	loads.push(loadavg()[0])
	for (let i = 0; i < arms.length; i++) {
		const arm = arms[(i + round) % arms.length]
		for (const mode of modes) {
			const { instructions, output } = await run(arm, mode)
			const s = samples[arm.name]
			if (mode === "import") {
				s.importInstructions.push(instructions)
				s.importMs.push(output.importMs)
			} else {
				s.firstInstructions.push(instructions)
				s.firstMs.push(output.firstMs)
				s.hotNs.push(output.hotNs)
			}
		}
	}
	process.stderr.write(".")
}
process.stderr.write("\n")
rmSync(out, { recursive: true, force: true })

const version = commit()
const results = {
	commit: version,
	node: process.version,
	at: new Date().toISOString(),
	rounds,
	loads,
	arms: Object.fromEntries(
		arms.map(arm => [
			arm.name,
			{ bytes: arm.bytes, samples: samples[arm.name] }
		])
	)
}
const dir = join(here, "results")
mkdirSync(dir, { recursive: true })
const path = flag("out") ?? join(dir, `${version}.json`)
writeFileSync(path, `${JSON.stringify(results, null, "\t")}\n`)
console.log(`wrote ${path}`)

const { report } = await import("./report.ts")
report(path)
if (board) writeBoard(path, flag("board") ?? join(dir, `${version}.board.md`))
