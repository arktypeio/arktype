// Cold start: what a fresh process spends from just before it imports an
// app's bundle to just after its first validation of valid data returns.
// Counting, that is perf's user-space instructions over every thread, which
// load on the machine doesn't change; with STARTUP_WALL=1, nanoseconds, one
// process at a time while the 1-minute load is under 4.
//
// Each app is bundled as request handlers read it (bench/apps/*/consumer): a
// module with one handler per validator, which returns the data or the issues.
// The bundle is bench/bundle.ts's (esbuild, esm, minify, neutral), as a
// production build for every library, ArkType precompiled with each of
// STARTUP_BUILDS' options. "form" is valibot.dev's login form (startup/form),
// the others are the homepage's apps. "baseline" is a handler that validates
// nothing, so a count less baseline's is what the library adds.
//
// A round runs every arm once in a rotated order, so arms pair by round.
// node startup.ts <out.json> <rounds>
// e.g. STARTUP_BUILDS='{"default":{}}' STARTUP_SCENARIOS=form,login
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import standaloneCode from "ajv/dist/standalone/index.js"
import { _ } from "ajv/dist/compile/codegen/index.js"
import { spawn, spawnSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { loadavg } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"
import { ajvOf } from "../libraries.ts"
import { median, signTest } from "../stats.ts"

const [outPath, roundsArg = "20"] = process.argv.slice(2)
const rounds = Number(roundsArg)
const wall = !!process.env.STARTUP_WALL
const builds: Record<string, PrecompileUnpluginOptions> = JSON.parse(
	process.env.STARTUP_BUILDS ?? '{"default":{}}'
)
const node = process.env.STARTUP_NODE ?? process.execPath
const cores = process.env.STARTUP_CORES ?? "10-15"
const concurrency = wall ? 1 : Number(process.env.STARTUP_JOBS ?? 4)
// where each process runs, which, with the bundle's path, can move a count
const cwd = process.env.STARTUP_CWD ?? "/"

const bench = join(import.meta.dirname, "..")
const apps = join(bench, "apps")
const out = join(bench, "out", "startup")
mkdirSync(out, { recursive: true })

const user = {
	id: "1f0c3a52-7b1e-4c5d-9a8b-2e3f4a5b6c7d",
	email: "ada@example.com",
	name: "Ada",
	createdAt: "2026-10-09T12:00:00.000Z"
}
const price = { amount: 1999, currency: "USD" }

// bench/import.ts's valid data
const validated = {
	form: [
		"LoginSchema",
		{ email: "ada@example.com", password: "correct horse" }
	],
	login: ["Login", { email: "ada@example.com", password: "correct horse" }],
	moltar: [
		"Moltar",
		{
			number: 1,
			negNumber: -1,
			maxNumber: Number.MAX_VALUE,
			string: "string",
			longString: "Lorem ipsum",
			boolean: true,
			deeplyNested: { foo: "bar", num: 1, bool: false }
		}
	],
	shop: [
		"Webhook",
		{
			id: user.id,
			sentAt: user.createdAt,
			attempt: 1,
			event: {
				type: "order.placed",
				order: {
					id: user.id,
					customer: user,
					items: [
						{
							product: {
								id: user.id,
								sku: "ABC-1234",
								name: "Widget",
								price,
								category: { id: user.id, name: "Tools" },
								tags: ["red"],
								image: "https://example.com/widget.png"
							},
							quantity: 2,
							unitPrice: price
						}
					],
					shipping: {
						street: "1 Main St",
						city: "Springfield",
						postalCode: "12345",
						country: "US"
					},
					payment: { method: "card", last4: "4242", expires: "12/30" },
					total: { amount: 3998, currency: "USD" },
					placedAt: user.createdAt
				}
			}
		}
	]
} satisfies Record<string, [name: string, data: object]>

type Scenario = keyof typeof validated

const scenarios = (process.env.STARTUP_SCENARIOS?.split(",") ??
	Object.keys(validated)) as Scenario[]

const rivals = [
	"valibot",
	"zod",
	"zodCompiled",
	"zodMini",
	"typia",
	"ajv",
	"typebox"
] as const

type Rival = (typeof rivals)[number]

// each handler's body: the data or the issues, as the library reports them
const handlerOf: Record<Rival | "arktype", (name: string) => string> = {
	arktype: name =>
		`const out = ${name}(body)\n\treturn out instanceof type.errors ? { issues: out.issues } : { data: out }`,
	valibot: name =>
		`const out = v.safeParse(${name}, body)\n\treturn out.success ? { data: out.output } : { issues: out.issues }`,
	zod: name =>
		`const out = ${name}.safeParse(body)\n\treturn out.success ? { data: out.data } : { issues: out.error.issues }`,
	zodCompiled: name => handlerOf.zod(name),
	zodMini: name =>
		`const out = z.safeParse(${name}, body)\n\treturn out.success ? { data: out.data } : { issues: out.error.issues }`,
	typia: name =>
		`const out = ${name}(body)\n\treturn out.success ? { data: out.data } : { issues: out.errors }`,
	ajv: name =>
		`return ${name}(body) ? { data: body } : { issues: ${name}.errors }`,
	typebox: name =>
		`return ${name}.Check(body) ? { data: body } : { issues: ${name}.Errors(body) }`
}

const importsOf: Record<Rival | "arktype", string> = {
	arktype: `import { type } from "arktype"`,
	valibot: `import * as v from "valibot"`,
	zod: "",
	zodCompiled: `import "zod/compile"`,
	zodMini: `import * as z from "zod/mini"`,
	typia: "",
	ajv: "",
	typebox: ""
}

// the module holding a library's validators for a scenario and their names,
// or undefined if it has none
const definitionsOf = async (
	scenario: Scenario,
	library: Rival | "arktype"
): Promise<[path: string, names: string[]] | undefined> => {
	const path = await definitionPathOf(scenario, library)
	if (!path) return
	const names =
		library === "ajv" ?
			Object.keys(await import(join(apps, scenario, "ajv.ts")))
		:	Object.keys(await import(path))
	return [path, names]
}

const definitionPathOf = async (
	scenario: Scenario,
	library: Rival | "arktype"
): Promise<string | undefined> => {
	const file = library === "zodCompiled" ? "zod" : library
	if (scenario === "form") {
		const path = join(import.meta.dirname, "startup", "form", `${file}.ts`)
		return existsSync(path) ? path : undefined
	}
	if (library === "typia") {
		const path = join(bench, "out", "typia", "apps", scenario, "typia.js")
		return existsSync(path) ? path : undefined
	}
	if (library === "ajv") {
		const schemas: Record<string, object> = await import(
			join(apps, scenario, "ajv.ts")
		)
		const ajv = ajvOf({
			schemas: Object.values(schemas),
			code: {
				source: true,
				esm: true,
				formats: _`require("ajv-formats/dist/formats").fullFormats`
			}
		})
		const path = join(out, `${scenario}.ajvCode.js`)
		writeFileSync(
			path,
			standaloneCode.default(
				ajv,
				Object.fromEntries(Object.keys(schemas).map(name => [name, name]))
			)
		)
		return path
	}
	const path = join(apps, scenario, `${file}.ts`)
	return existsSync(path) ? path : undefined
}

// a handler per validator the definitions export
const writeEntry = async (
	scenario: Scenario,
	library: Rival | "arktype"
): Promise<string | undefined> => {
	const found = await definitionsOf(scenario, library)
	if (!found) return
	const [definitions, names] = found
	const path = join(out, `${scenario}.${library}.entry.ts`)
	writeFileSync(
		path,
		[
			importsOf[library],
			`import { ${names.join(", ")} } from ${JSON.stringify(definitions)}`,
			...names.map(
				name =>
					`export const check${name} = (body: unknown) => {\n\t${handlerOf[library](name)}\n}`
			)
		].join("\n")
	)
	return path
}

const bundle = async (
	entry: string,
	options: PrecompileUnpluginOptions | undefined
): Promise<string> => {
	const { outputFiles } = await build({
		entryPoints: [entry],
		bundle: true,
		minify: true,
		format: "esm",
		platform: "neutral",
		write: false,
		logLevel: "error",
		conditions: ["production"],
		plugins: options ? [precompile.esbuild({ cwd: apps, ...options })] : []
	})
	return outputFiles[0].text
}

type Arm = { name: string; scenario: Scenario; path: string }

const arms: Arm[] = []

// every bundle's path has the same length, since a longer one can cost a
// count 0.37M instructions (from a 61-character directory, the moltar ajv
// bundle's would grow 7% with a 12-character file name)
const add = (name: string, scenario: Scenario, code: string) => {
	const path = join(out, `arm${String(arms.length).padStart(3, "0")}.js`)
	writeFileSync(path, code)
	arms.push({ name: `${scenario} ${name}`, scenario, path })
}

for (const scenario of scenarios) {
	const [name] = validated[scenario]
	add(
		"baseline",
		scenario,
		`export const check${name} = body => ({ data: body })`
	)
	const arktypeEntry = await writeEntry(scenario, "arktype")
	for (const [build, options] of Object.entries(builds))
		add(`arktype ${build}`, scenario, await bundle(arktypeEntry!, options))
	for (const library of rivals) {
		const entry = await writeEntry(scenario, library)
		if (entry) add(library, scenario, await bundle(entry, undefined))
	}
}
writeFileSync(
	join(out, "arms.json"),
	JSON.stringify(
		Object.fromEntries(arms.map(arm => [arm.name, arm.path])),
		null,
		1
	)
)

// counting from just before the import to just after the first validation
const child = (arm: Arm) => `
import { openSync, readSync, writeSync } from "node:fs"
const data = JSON.parse(process.env.STARTUP_DATA)
const wall = !!process.env.STARTUP_WALL
const ctl = wall || openSync(process.env.PERF_CTL, "w")
const ack = wall || openSync(process.env.PERF_ACK, "r")
const perf = command => {
	writeSync(ctl, command + "\\n")
	readSync(ack, Buffer.alloc(5))
}
const url = ${JSON.stringify(pathToFileURL(arm.path).href)}
let from, to
if (wall) from = process.hrtime.bigint()
else perf("enable")
const m = await import(url)
const out = m.check${validated[arm.scenario][0]}(data)
if (wall) to = process.hrtime.bigint()
else perf("disable")
if (!("data" in out)) throw new Error("invalid: " + JSON.stringify(out.issues))
console.log(JSON.stringify({ ns: wall ? Number(to - from) : 0 }))`

const fifos = mkdtempSync(join(out, "fifo-"))
let fifoCount = 0

const env = { ...process.env }
// the repo's ts runner resolves arktype to its sources through NODE_OPTIONS
delete env.NODE_OPTIONS
delete env.NODE_COMPILE_CACHE

const measure = (arm: Arm) =>
	new Promise<number>((resolve, reject) => {
		const id = fifoCount++
		const ctl = join(fifos, `ctl${id}`)
		const ack = join(fifos, `ack${id}`)
		if (!wall) spawnSync("mkfifo", [ctl, ack])
		const command = [
			"taskset",
			"-c",
			cores,
			...(wall ?
				[]
			:	[
					"perf",
					"stat",
					"-x,",
					"-e",
					"instructions:u",
					"-D",
					"-1",
					"--control",
					`fifo:${ctl},${ack}`,
					"--"
				]),
			node,
			"--input-type=module",
			"--eval",
			child(arm)
		]
		const proc = spawn(command[0], command.slice(1), {
			cwd,
			env: {
				...env,
				STARTUP_DATA: JSON.stringify(validated[arm.scenario][1]),
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
			if (wall) return resolve(JSON.parse(stdout).ns)
			const line = stderr
				.split("\n")
				.map(line => line.split(","))
				.find(fields => fields[2] === "instructions:u")
			if (!line) return reject(new Error(`${arm.name}: ${stderr}`))
			resolve(Number(line[0]))
		})
	})

const samples: Record<string, number[]> = Object.fromEntries(
	arms.map(arm => [arm.name, []])
)
const loads: number[] = []

const waitForQuiet = () => {
	while (loadavg()[0] >= 4) spawnSync("sleep", ["15"])
}

for (let round = 0; round < rounds; round++) {
	if (wall) waitForQuiet()
	loads.push(loadavg()[0])
	const order = arms.map((_, i) => arms[(i + round) % arms.length])
	const results = new Map<Arm, number>()
	const queue = [...order]
	await Promise.all(
		Array.from({ length: concurrency }, async () => {
			for (let arm = queue.shift(); arm; arm = queue.shift())
				results.set(arm, await measure(arm))
		})
	)
	for (const arm of arms) samples[arm.name].push(results.get(arm)!)
	process.stderr.write(".")
}
process.stderr.write("\n")
rmSync(fifos, { recursive: true, force: true })

writeFileSync(
	outPath,
	JSON.stringify(
		{
			unit: wall ? "ns" : "instructions:u",
			node: spawnSync(node, ["--version"], { encoding: "utf8" }).stdout.trim(),
			builds,
			loads,
			samples
		},
		null,
		1
	)
)

// each ArkType build against every rival in its scenario, paired by round
const format = (n: number) =>
	wall ? `${(n / 1e6).toFixed(3)} ms` : `${(n / 1e6).toFixed(2)}M`
for (const scenario of scenarios) {
	const baseline = median(samples[`${scenario} baseline`])
	const inScenario = arms.filter(arm => arm.scenario === scenario)
	console.log(`${scenario}: median (less baseline, ${format(baseline)})`)
	console.table(
		Object.fromEntries(
			inScenario.map(arm => {
				const m = median(samples[arm.name])
				const row: Record<string, string> = {
					median: format(m),
					net: format(m - baseline)
				}
				if (arm.name.includes(" arktype ")) {
					const versus = inScenario.filter(
						other =>
							!other.name.includes(" arktype ") &&
							!other.name.endsWith(" baseline")
					)
					const ps = versus.map(other => {
						const ours = samples[arm.name]
						const theirs = samples[other.name]
						return {
							p: signTest(ours, theirs),
							wins: ours.filter((x, i) => x < theirs[i]).length
						}
					})
					const holds = (p: (typeof ps)[number]) =>
						p.p < 0.05 && p.wins * 2 > rounds
					row[wall ? "fastest of all" : "fewest of all"] =
						ps.every(holds) ?
							`yes: wins >= ${Math.min(...ps.map(p => p.wins))}/${rounds}, p <= ${Math.max(...ps.map(p => p.p)).toPrecision(2)}`
						:	`no: ${versus
								.filter((_, i) => !holds(ps[i]))
								.map(other => other.name.slice(scenario.length + 1))
								.join(", ")}`
				}
				return [arm.name.slice(scenario.length + 1), row]
			})
		)
	)
}
