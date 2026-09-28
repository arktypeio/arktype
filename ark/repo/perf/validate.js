// validate: steady-state ns per validation for `T.allows(data)` and `T(data)`.
//
// Each measurement gets a loop compiled just for it, so its call sites stay
// monomorphic. Every loop is calibrated to take about sampleMs and run once at
// that length to warm up. Then the loops take turns, one sample each per round,
// so every sample sees the same fully warmed process and drift spreads evenly
// across measurements. A loop cycles through its case's data.

import { importArktype, options, report } from "./child.js"

const samples = 10
const sampleMs = 100

const { type, ArkErrors } = await importArktype(options.root)

const flatData = {
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString: "Lorem ipsum dolor sit amet, ".repeat(40),
	boolean: true,
	deeplyNested: { foo: "bar", num: 1, bool: false }
}

// runtime.bench.ts's "moltar" type
const Flat = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: { foo: "string", num: "number", bool: "boolean" }
})

// data: the inputs a loop cycles through
// valid: whether each input is valid (default true)
// apply: the label and expression (over T and d) timed as apply
const cases = {
	flat: { T: Flat, data: [flatData] },
	nested: {
		T: type({
			id: "string",
			profile: {
				name: "string",
				age: "number",
				address: { street: "string", city: "string", zip: "string" }
			},
			settings: {
				theme: "'light' | 'dark'",
				notifications: { email: "boolean", sms: "boolean" }
			}
		}),
		data: [
			{
				id: "u1",
				profile: {
					name: "Ada",
					age: 36,
					address: { street: "1 Main St", city: "London", zip: "N1" }
				},
				settings: { theme: "dark", notifications: { email: true, sms: false } }
			}
		]
	},
	"array of 100": {
		T: type({ id: "number", name: "string", active: "boolean" }).array(),
		data: [
			Array.from({ length: 100 }, (_, i) => ({
				id: i,
				name: `item${i}`,
				active: i % 2 === 0
			}))
		]
	},
	constraints: {
		T: type({
			name: "1 <= string <= 50",
			email: "string.email",
			age: "0 <= number.integer < 150",
			ratio: "0 < number <= 1",
			code: /^[A-Z]{3}-\d{4}$/
		}),
		data: [
			{
				name: "Ada Lovelace",
				email: "ada@example.com",
				age: 36,
				ratio: 0.5,
				code: "ABC-1234"
			}
		]
	},
	discriminated: {
		T: type({ kind: "'a'", a: "string" })
			.or({ kind: "'b'", b: "number" })
			.or({ kind: "'c'", c: "boolean" })
			.or({ kind: "'d'", d: "string[]" }),
		data: [
			{ kind: "a", a: "x" },
			{ kind: "b", b: 1 },
			{ kind: "c", c: true },
			{ kind: "d", d: ["x"] }
		]
	},
	undiscriminated: {
		T: type({ a: "string" })
			.or({ b: "number" })
			.or({ c: "boolean" })
			.or({ d: "string[]" }),
		data: [{ a: "x" }, { b: 1 }, { c: true }, { d: ["x"] }]
	},
	"morph pipe": { T: type("string.numeric.parse"), data: ["12345"] },
	"defaults + optional": {
		T: type({
			a: "string",
			b: "number = 5",
			"c?": "boolean",
			d: "string = 'x'",
			"e?": "number"
		}),
		data: [{ a: "s", c: true }]
	},
	"delete undeclared": {
		T: type({ a: "string", b: "number" }).onUndeclaredKey("delete"),
		data: [{ a: "x", b: 1, c: true, d: "extra" }]
	},
	invalid: {
		T: Flat,
		data: [
			{
				...flatData,
				number: "1",
				deeplyNested: { ...flatData.deeplyNested, bool: "false" }
			}
		],
		valid: false,
		apply: ["apply + summary", "T(d).summary"]
	}
}

const loopOf = expression =>
	new Function(
		"T",
		"data",
		"n",
		`const mask = data.length - 1
let result
for (let i = 0; i < n; i++) {
	const d = data[i & mask]
	result = ${expression}
}
return result`
	)

// every loop's result is stored here, so none can be optimized away
let sink

const measurements = []
for (const [
	name,
	{ T, data, valid = true, apply = ["apply", "T(d)"] }
] of Object.entries(cases)) {
	if (data.length & (data.length - 1))
		throw new Error(`${name} needs a power of 2 inputs`)
	for (const d of data) {
		// a build that rejects valid data (or accepts invalid data) is not faster
		if (T.allows(d) !== valid || T(d) instanceof ArkErrors === valid)
			throw new Error(`${name} does not validate as expected`)
	}
	measurements.push(
		{ name: `${name} allows (ns)`, T, data, loop: loopOf("T.allows(d)") },
		{ name: `${name} ${apply[0]} (ns)`, T, data, loop: loopOf(apply[1]) }
	)
}

const run = (m, n) => {
	const start = performance.now()
	sink = m.loop(m.T, m.data, n)
	return performance.now() - start
}

const iterationsFor = (n, ms) => Math.max(1, Math.round((n * sampleMs) / ms))

for (const m of measurements) {
	let n = 1
	let ms
	while ((ms = run(m, n)) < sampleMs / 10) n *= 2
	// one full-length run to warm up, then recalibrate on the warmed code
	n = iterationsFor(n, ms)
	m.n = iterationsFor(n, run(m, n))
	m.samples = []
}

globalThis.gc?.()

for (let round = 0; round < samples; round++)
	for (const m of measurements) m.samples.push((run(m, m.n) * 1e6) / m.n)

report(Object.fromEntries(measurements.map(m => [m.name, m.samples])))
