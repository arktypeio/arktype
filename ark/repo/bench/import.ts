// run `pnpm build` first to bundle arktype's build

import { flatMorph } from "@ark/util"
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { loadavg } from "node:os"
import {
	bundle,
	libraries,
	scenarios,
	type Library,
	type Scenario
} from "./bundle.ts"

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

// a Type returns ArkErrors, an array, for invalid data
const isValid: Record<Library, (name: string) => string> = {
	valibot: name => `m.safeParse(m.${name}, data).success`,
	zod: name => `m.${name}.safeParse(data).success`,
	arktype: name => `!Array.isArray(m.${name}(data))`,
	standalone: name => `!Array.isArray(m.${name}(data))`
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

const env = { ...process.env }
// the repo's ts runner resolves arktype to its sources through NODE_OPTIONS
delete env.NODE_OPTIONS
delete env.NODE_COMPILE_CACHE

const run = (arm: (typeof arms)[number]): Sample => {
	const result = spawnSync(
		process.execPath,
		[
			"--expose-gc",
			"--input-type=module",
			"--eval",
			child(arm.path, arm.scenario, arm.library)
		],
		{ env, encoding: "utf8" }
	)
	if (result.status !== 0) throw new Error(result.stderr)
	return JSON.parse(result.stdout)
}

const samples = flatMorph(arms, (i, arm) => [arm.name, [] as Sample[]])

const loadBefore = loadavg()[0]

for (let i = 0; i < processesPerArm; i++) {
	for (let j = 0; j < arms.length; j++) {
		const arm = arms[(i + j) % arms.length]
		samples[arm.name].push(run(arm))
	}
}

const quantile = (sorted: number[], q: number) => {
	const position = (sorted.length - 1) * q
	const lowerIndex = Math.floor(position)
	return (
		sorted[lowerIndex] +
		(sorted[Math.ceil(position)] - sorted[lowerIndex]) * (position - lowerIndex)
	)
}

// the median, then the interquartile range
const summarize = (values: number[]) => {
	const sorted = values.sort((l, r) => l - r)
	const [q1, median, q3] = [0.25, 0.5, 0.75].map(q =>
		quantile(sorted, q).toFixed(2)
	)
	return `${median} (${q1}-${q3})`
}

console.table(
	flatMorph(samples, (name, armSamples) => [
		name,
		{
			"load (ms)": summarize(armSamples.map(s => s.load)),
			"first parse (ms)": summarize(armSamples.map(s => s.firstParse)),
			"heap (MiB)": summarize(armSamples.map(s => s.heap))
		}
	])
)

console.log(
	`1-minute load: ${loadBefore.toFixed(1)} before, ${loadavg()[0].toFixed(1)} after`
)
