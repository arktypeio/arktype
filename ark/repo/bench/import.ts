// run `pnpm build` first to bundle arktype's build

import { flatMorph } from "@ark/util"
import { spawnSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { loadavg } from "node:os"
import { join } from "node:path"
import { isDeepStrictEqual } from "node:util"
import { bundle, scenarios, type Scenario } from "./bundle.ts"
import { libraries, type Library } from "./libraries.ts"
import { pinned, standingOf, summarize } from "./stats.ts"

const processesPerArm = 20

const id = "1f0c3a52-7b1e-4c5d-9a8b-2e3f4a5b6c7d"
const at = "2026-10-09T12:00:00.000Z"
const user = { id, email: "ada@example.com", name: "Ada", createdAt: at }
const address = {
	street: "1 Main St",
	city: "Springfield",
	postalCode: "12345",
	country: "US"
}
const price = { amount: 1999, currency: "USD" }

const parsed: Record<Scenario, [name: string, data: object]> = {
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
			id,
			sentAt: at,
			attempt: 1,
			event: {
				type: "order.placed",
				order: {
					id,
					customer: user,
					items: [
						{
							product: {
								id,
								sku: "ABC-1234",
								name: "Widget",
								price,
								category: { id, name: "Tools" },
								tags: ["red"],
								image: "https://example.com/widget.png"
							},
							quantity: 2,
							unitPrice: price
						}
					],
					shipping: address,
					payment: { method: "card", last4: "4242", expires: "12/30" },
					total: { amount: 3998, currency: "USD" },
					placedAt: at
				}
			}
		}
	]
}

// a Type returns errors with a count for invalid data
const isValid: Record<Library, (name: string) => string> = {
	valibot: name => `m.safeParse(m.${name}, data).success`,
	zod: name => `m.${name}.safeParse(data).success`,
	zodCompiled: name => `m.${name}.safeParse(data).success`,
	zodMini: name => `m.safeParse(m.${name}, data).success`,
	typia: name => `m.${name}(data).success`,
	ajv: name => `m.${name}(data)`,
	typebox: name => `m.${name}.Check(data)`,
	arktype: name => `typeof m.${name}(data)?.count !== "number"`,
	standalone: name => `typeof m.${name}(data)?.count !== "number"`,
	standaloneFirst: name => `typeof m.${name}(data)?.count !== "number"`
}

const child = (path: string, scenario: Scenario, library: Library) => `
const data = ${JSON.stringify(parsed[scenario][1])}
const marks = [performance.now()]
const m = await import(${JSON.stringify(path)})
marks.push(performance.now())
if (!(${isValid[library](parsed[scenario][0])})) throw new Error("invalid")
marks.push(performance.now())
globalThis.gc()
console.log(JSON.stringify({ load: marks[1] - marks[0], firstParse: marks[2] - marks[1], heap: process.memoryUsage().heapUsed / 2 ** 20 }))`

type Sample = { load: number; firstParse: number; heap: number }

const out = join(import.meta.dirname, "out")
mkdirSync(out, { recursive: true })

const arms = scenarios.flatMap(scenario =>
	libraries.map(library => {
		const path = join(out, `${scenario}.${library}.js`)
		return { name: `${scenario} (${library})`, path, scenario, library }
	})
)

for (const arm of arms)
	writeFileSync(arm.path, (await bundle(arm.scenario, arm.library)).js)

// each bundle has its own copy of zod, so results compare by their parts
const zodResultOf = (result: any) => [
	result.success,
	result.data,
	result.error?.issues
]

// compiled zod answers as zod does, rather than falling back to its runtime
for (const scenario of scenarios) {
	const [name, data] = parsed[scenario]
	const zod = await import(join(out, `${scenario}.zod.js`))
	const compiled = await import(join(out, `${scenario}.zodCompiled.js`))
	for (const input of [data, {}]) {
		if (
			!isDeepStrictEqual(
				zodResultOf(compiled[name].safeParse(input)),
				zodResultOf(zod[name].safeParse(input))
			)
		)
			throw new Error(`zodCompiled disagrees with zod on ${scenario}`)
	}
	if (!compiled[name]._zod.bag.validator)
		throw new Error(`zod/compile left ${scenario} on zod's runtime parser`)
}

const cold = { ...process.env }
// the repo's ts runner resolves arktype to its sources through NODE_OPTIONS
delete cold.NODE_OPTIONS
delete cold.NODE_COMPILE_CACHE

// a warm process reuses an earlier one's compiled code, as a primed server does
const compileCache = join(out, "compile-cache")
rmSync(compileCache, { recursive: true, force: true })
const warm = { ...cold, NODE_COMPILE_CACHE: compileCache }

const run = (arm: (typeof arms)[number], env: NodeJS.ProcessEnv): Sample => {
	const [command, ...args] = pinned([
		process.execPath,
		"--expose-gc",
		"--input-type=module",
		"--eval",
		child(arm.path, arm.scenario, arm.library)
	])
	const result = spawnSync(command, args, { env, encoding: "utf8" })
	if (result.status !== 0) throw new Error(result.stderr)
	return JSON.parse(result.stdout)
}

for (const arm of arms) run(arm, warm)

const samples = flatMorph(arms, (i, arm) => [
	arm.name,
	{ cold: [] as Sample[], warm: [] as Sample[] }
])

const loadBefore = loadavg()[0]

for (let i = 0; i < processesPerArm; i++) {
	for (let j = 0; j < arms.length; j++) {
		const arm = arms[(i + j) % arms.length]
		samples[arm.name].cold.push(run(arm, cold))
		samples[arm.name].warm.push(run(arm, warm))
	}
}

const formatMs = (ms: number) => ms.toFixed(2)

console.table(
	flatMorph(samples, (name, armSamples) => [
		name,
		{
			"load, cold (ms)": summarize(
				armSamples.cold.map(s => s.load),
				formatMs
			),
			"load, warm (ms)": summarize(
				armSamples.warm.map(s => s.load),
				formatMs
			),
			"first parse, cold (ms)": summarize(
				armSamples.cold.map(s => s.firstParse),
				formatMs
			),
			"heap (MiB)": summarize(
				armSamples.cold.map(s => s.heap),
				formatMs
			)
		}
	])
)

// load plus first parse, as a program pays them before its first answer
const startupOf = (sample: Sample) => sample.load + sample.firstParse

console.log(
	"startup standings, ms to load and parse once (p: sign test against the best other, paired by round)"
)
console.table(
	Object.fromEntries(
		scenarios.flatMap(scenario =>
			(["cold", "warm"] as const).map(start => [
				`${scenario} ${start}`,
				standingOf(
					Object.fromEntries(
						libraries.map(library => [
							library,
							samples[`${scenario} (${library})`][start].map(startupOf)
						])
					),
					formatMs
				)
			])
		)
	)
)

writeFileSync(join(out, "import.json"), JSON.stringify(samples))

console.log(
	`1-minute load: ${loadBefore.toFixed(1)} before, ${loadavg()[0].toFixed(1)} after`
)
