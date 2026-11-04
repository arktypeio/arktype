import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { writeFixture } from "./utils.ts"

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts", "production"]

const bundle = async (root: string, opts: PrecompileUnpluginOptions = {}) => {
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [precompile.esbuild({ cwd: root, conditions, ...opts })]
	})
	return outputFiles![0].text
}

// what a bundle logs, then the error ending it
const behaviorOf = (js: string) => {
	const { stdout, stderr } = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", "--input-type=module"],
		{ input: js, cwd: fromHere(), encoding: "utf8" }
	)
	return `${stdout}${stderr.match(/^\w*Error\b.*$/m)?.[0] ?? ""}`
}

const smallest = { preset: "smallest" } as const

// a build chooses compiled code for a program too small to repay checkers
const repaying = Array.from(
	{ length: 30 },
	(_, i) =>
		`export const F${i} = type({ a${i}: "string > ${i}", b${i}: "number > ${i}", c${i}: "string < ${i + 9}" })`
).join("\n")

const appOf = (narrow: string, body: string) => `import { type } from "arktype"

const isLong = ${narrow}
const N = type("string").narrow(isLong)
const run = (f: () => unknown) => {
	globalThis.calls = 0
	const out = f()
	console.log(out instanceof type.errors ? out.summary : JSON.stringify(out), globalThis.calls)
}
${body}
${repaying}
`

const body = "globalThis.calls++; return s.length > (globalThis.limit ?? 2)"
// `arguments` leaves it unproved, so it's written as it was before a build could
// tell a callback can't reach its ctx
const proved = `function (s: string) { ${body} }`
const unproved = `function (s: string) { void arguments; ${body} }`

contextualize(function (this: Mocha.Suite) {
	// each case bundles, which a loaded machine slows past mocha's default
	this.timeout(120_000)

	const fixture = (name: string, main: string) =>
		writeFixture({ "main.ts": main }, fromHere("temp", "checkers", name))

	const itRunsAsUnproved = (name: string, source: string) =>
		it(name, async () => {
			const dir = name.replace(/\W+/g, "-")
			const expected = behaviorOf(
				await bundle(fixture(`${dir}-unproved`, appOf(unproved, source)))
			)
			const root = fixture(`${dir}-proved`, appOf(proved, source))
			attest(behaviorOf(await bundle(root))).equals(expected)
			const checkers = await bundle(root, smallest)
			attest(checkers.includes("narrowedBy(")).equals(true)
			attest(behaviorOf(checkers)).equals(expected)
		})

	describe("a narrow that reads only its argument", () => {
		itRunsAsUnproved(
			"runs as often at each depth, beside what transforms",
			`const Deep = type({
	a: N,
	"b?": N,
	c: { d: N, e: { f: N, g: "string = 'x'" } },
	list: N.array()
})
const good = { a: "abc", c: { d: "abc", e: { f: "abc" } }, list: ["abc"] }
run(() => Deep(good))
run(() => Deep({ ...good, a: "x" }))
run(() => Deep({ ...good, b: "x" }))
run(() => Deep({ ...good, c: { d: "x", e: { f: "x" } } }))
run(() => Deep({ ...good, list: ["abc", "x", "y"] }))
run(() => Deep({ list: [] }))
run(() => Deep.allows({ ...good, c: { d: "x", e: { f: "abc" } } }))
run(() => ["abc", "x"].filter(N.allows))
`
		)

		itRunsAsUnproved(
			"runs in the order it did, past what Allows checks first",
			`const Ordered = type({ a: N, b: "string", c: { d: N }, e: "number", f: N, g: "string.email", h: "string[]" })
const good = { a: "abc", b: "b", c: { d: "abc" }, e: 1, f: "abc", g: "a@b.co", h: [] }
run(() => Ordered(good))
run(() => Ordered.allows({ ...good, a: "x", b: 1 }))
run(() => Ordered.allows({ ...good, c: { d: "x" }, f: "x", g: 1 }))
run(() => Ordered.allows({ ...good, f: "x", h: 1 }))
run(() => Ordered({ ...good, c: { d: "x" }, f: "x", g: 1 }))
`
		)

		itRunsAsUnproved(
			"runs as often in each kind of union",
			`const Nullable = type({ v: N.or("null") })
run(() => Nullable({ v: "x" }))
run(() => Nullable({ v: null }))
const Keyed = type({ k: "'a'", v: N }).or({ k: "'b'", v: N, w: N })
run(() => Keyed({ k: "b", v: "x", w: "y" }))
run(() => Keyed({ k: "c", v: "x" }))
const Unkeyed = type({ k: "'a'", v: N, w: N }).or({ v: "number", w: N })
run(() => Unkeyed({ k: "a", v: "x", w: "y" }))
run(() => Unkeyed({ v: 1, w: "y" }))
run(() => Unkeyed({ v: 1, w: "abc" }))
const Plain = N.or(type("string").narrow(isLong).atMostLength(1))
run(() => Plain("x"))
run(() => Plain("abc"))
`
		)

		itRunsAsUnproved(
			"runs when it's called, not when its errors are read",
			`const Limited = type({ s: N })
const errors = Limited({ s: "x" })
globalThis.limit = 0
console.log(String(errors))
globalThis.limit = 2
console.log(String(Limited({ s: "x" })))
`
		)

		it("names its function, or what's written for it", async () => {
			const root = fixture(
				"names",
				`import { type } from "arktype"

const isLong = (s: string) => s.length > 2
const T = type({
	named: type("string").narrow(isLong),
	anonymous: type("string").narrow(s => s.length > 2),
	described: type("string").narrow(isLong).describe("long"),
	configured: type("string").narrow(isLong).configure({ message: "too short" }),
	bare: type("unknown").narrow(isLong as never),
	"missing?": type("string").narrow(isLong)
})
console.log(String(T({ named: "x", anonymous: "x", described: "x", configured: "x", bare: "x", missing: "x" })))
console.log(String(T({})))
${repaying}
`
			)
			const expected = `named must be valid according to isLong
anonymous must be valid according to an anonymous predicate
described must be long
too short
bare must be valid according to isLong
missing must be valid according to isLong
named must be a string
anonymous must be a string
described must be a string
configured must be a string
bare must be present
`
			attest(behaviorOf(await bundle(root))).equals(expected)
			attest(behaviorOf(await bundle(root, smallest))).equals(expected)
		})

		for (const [name, narrow] of Object.entries({
			"a default past its param": `(s: string, ctx: any = undefined) => ctx ? ctx.reject("reached") : s.length > 5`,
			"a rest past its param": `(s: string, ...[ctx]: any[]) => ctx ? ctx.reject("reached") : s.length > 5`,
			arguments: `function (s: string) { const ctx = arguments[1]; return ctx ? ctx.reject("reached") : s.length > 5 }`,
			eval: `function (s: string) { const ctx = eval("arguments[1]"); return ctx ? ctx.reject("reached") : s.length > 5 }`
		})) {
			it(`reaches its ctx by ${name}, so isn't proved`, async () => {
				const root = fixture(
					name.replace(/\W+/g, "-"),
					appOf(narrow, `console.log(String(type({ s: N })({ s: "abc" })))`)
				)
				const expected = "s must be reached\n"
				attest(behaviorOf(await bundle(root))).equals(expected)
				const checkers = await bundle(root, smallest)
				attest(checkers.includes("narrowedBy(")).equals(false)
				attest(behaviorOf(checkers)).equals(expected)
			})
		}

		it("stays apart from one of its arity that reaches its ctx", async () => {
			const root = fixture(
				"apart",
				`import { type } from "arktype"

const isLong = (s: string) => s.length > 5
const reaches = function (s: string) { const ctx = arguments[1]; return ctx ? ctx.reject("reached") : s.length > 5 }
const A = type({ s: type("string").narrow(isLong) })
const B = type({ s: type("string").narrow(reaches) })
console.log(String(A({ s: "abc" })))
console.log(String(B({ s: "abc" })))
${repaying}
`
			)
			const expected = `s must be valid according to isLong
s must be reached
`
			attest(behaviorOf(await bundle(root))).equals(expected)
			attest(behaviorOf(await bundle(root, smallest))).equals(expected)
		})

		it("needs no Traversal", async () => {
			const js = await bundle(
				fixture(
					"noTraversal",
					appOf(proved, `console.log(String(type({ s: N })({ s: "x" })))`)
				)
			)
			attest(js.includes("class Traversal")).equals(false)
		})
	})

	describe("a key a checker doesn't declare", () => {
		itRunsAsUnproved(
			"is rejected as compiled code rejects it",
			`const Closed = type({ "+": "reject", a: N, "b?": "string" })
run(() => Closed({ a: "abc" }))
run(() => Closed({ a: "abc", b: "b" }))
run(() => Closed({ a: "abc", c: 1 }))
run(() => Closed({ a: "x", c: 1, d: 2 }))
run(() => Closed({ a: "abc", toString: 1 }))
run(() => Closed({ a: "abc", constructor: 1 }))
run(() => Closed(Object.create({ a: "abc", inherited: 1 })))
run(() => Closed(JSON.parse('{"a":"abc","__proto__":1}')))
run(() => Closed("abc"))
run(() => Closed.allows({ a: "abc", c: 1 }))
const Defaulted = type({ "+": "reject", a: N, b: "string = 'x'" })
run(() => Defaulted({ a: "abc" }))
run(() => Defaulted({ a: "abc", c: 1 }))
run(() => Defaulted({ a: "x", c: 1 }))
const Written = type({ "+": "reject", a: "string" }).configure({ expected: "closed" })
run(() => Written({ a: "abc", c: 1 }))
const Deep = type({ "+": "reject", a: { "+": "reject", b: N } })
run(() => Deep({ a: { b: "x", c: 1 }, d: 1 }))
const Empty = type({ "+": "reject" })
run(() => Empty({}))
run(() => Empty({ a: 1 }))
run(() => Empty([]))
const List = type({ "+": "reject", a: "string" }).array()
run(() => List([{ a: "a" }, { a: "a", b: 1 }]))
`
		)

		itRunsAsUnproved(
			"is deleted as compiled code deletes it",
			`const Del = type({ "+": "delete", a: N, "b?": "string", c: "string = 'x'", d: { "+": "delete", e: "number = 1" } })
const good = { a: "abc", d: {} }
run(() => Del(good))
run(() => Del({ ...good, extra: 1, b: "b" }))
run(() => Del({ ...good, a: "x", extra: 1 }))
run(() => Del({ ...good, d: { e: "x", extra: 1 } }))
run(() => Del("abc"))
class Extra { a = "abc"; d = { e: 2 }; extra = 1; get g() { return 1 } }
const extra = new Extra()
const copied = Del(extra)
console.log(copied === extra, copied instanceof Extra, JSON.stringify(copied), JSON.stringify(extra))
class Declared { a = "abc"; c = "c"; d = { e: 2 } }
const declared = new Declared()
const kept = Del(declared)
console.log(kept === declared, kept instanceof Declared, JSON.stringify(kept))
const sym = Symbol("s")
const held = Object.assign(Object.create({ inherited: 1 }), { a: "abc", d: {}, [sym]: 1 })
const out = Del(held)
console.log(sym in out, "inherited" in out, Object.keys(out), Object.getPrototypeOf(out) === Object.getPrototypeOf(held))
const frozen = Object.freeze({ a: "abc", c: "c", d: Object.freeze({ e: 1 }) })
console.log(Del(frozen) === frozen, JSON.stringify(Del(frozen)))
const proto = JSON.parse('{"a":"abc","d":{},"__proto__":{"x":1}}')
console.log(JSON.stringify(Del(proto)), Object.keys(Del(proto)))
const List = type({ "+": "delete", a: "string", o: "string = 'z'" }).array()
console.log(JSON.stringify(List([{ a: "a" }, { a: "b", o: "o", p: 1 }])))
const Keyed = type({ "+": "delete", k: "'a'", v: N }).or({ "+": "delete", k: "'b'", w: "number = 1" })
console.log(JSON.stringify(Keyed({ k: "a", v: "abc", x: 1 })), JSON.stringify(Keyed({ k: "b", x: 1 })), String(Keyed({ k: "a", v: "x" })))
const Nullable = type({ o: type({ "+": "delete", a: "string" }).or("null") })
console.log(JSON.stringify(Nullable({ o: { a: "a", b: 1 } })), JSON.stringify(Nullable({ o: null })))
const Parent = type({ child: { "+": "delete", a: "string" }, other: "string = 'y'" })
console.log(JSON.stringify(Parent({ child: { a: "a", b: 1 } })))
const unchanged = { child: { a: "a" }, other: "o" }
console.log(Parent(unchanged) === unchanged, Parent(unchanged).child === unchanged.child)
`
		)
	})

	it("reads a failing value once at each depth, with no ctx", async () => {
		const js = await bundle(
			fixture(
				"failingOnce",
				appOf(
					proved,
					`const Deep = type({ a: { b: { c: { d: { e: N } } } } })
run(() => Deep.allows({ a: { b: { c: { d: { e: "x" } } } } }))
`
				)
			),
			smallest
		)
		attest(behaviorOf(js)).equals("false 1\n")
	})
})
