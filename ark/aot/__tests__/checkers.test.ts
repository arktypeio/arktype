import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { runPlain, writeFixture } from "./utils.ts"

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

	const itRunsAsUnproved = (
		name: string,
		source: string,
		forms: [proved: string, unproved: string, checker: string] = [
			proved,
			unproved,
			"narrowedBy("
		]
	) =>
		it(name, async () => {
			const dir = name.replace(/\W+/g, "-")
			const expected = behaviorOf(
				await bundle(fixture(`${dir}-unproved`, appOf(forms[1], source)))
			)
			const root = fixture(`${dir}-proved`, appOf(forms[0], source))
			attest(behaviorOf(await bundle(root))).equals(expected)
			const checkers = await bundle(root, smallest)
			attest(checkers.includes(forms[2])).equals(true)
			attest(behaviorOf(checkers)).equals(expected)
		})

	describe("what it writes", () => {
		it("reads as arktype does, whichever check holds its text", async () => {
			const root = fixture(
				"writes",
				`import { type } from "arktype"

const T = type({
	positive: "number > 0",
	nonNegative: "number >= 0",
	negative: "number < 0",
	nonPositive: "number <= 0",
	more: "number > 5",
	least: "number >= 5",
	less: "number < 5",
	most: "number <= 5",
	integer: "number % 1",
	even: "number % 2",
	third: "number % 3",
	"optional?": "string.uuid"
})
const Missing = type({ id: "string.uuid", ip: "string.ip", list: "string[]" })

console.log(String(T({ positive: 0, nonNegative: -1, negative: 0, nonPositive: 1, more: 5, least: 4, less: 5, most: 6, integer: 1.5, even: 3, third: 4, optional: 1 })))
console.log(String(Missing({})))
console.log(String(Missing({ id: 1, ip: "x", list: [1] })))
${repaying}
`
			)
			attest(behaviorOf(await bundle(root, smallest)))
				.snap(`positive must be positive
nonNegative must be non-negative
negative must be negative
nonPositive must be non-positive
more must be more than 5
least must be at least 5
less must be less than 5
most must be at most 5
integer must be an integer
even must be even
third must be a multiple of 3
optional must be a UUID
id must be a string
ip must be a string
list must be an array
id must be a UUID
ip must be an IP address
list[0] must be a string
`)
		})
	})

	describe("a union's issue", () => {
		const printed = `const printIssues = (out: unknown) => console.log(JSON.stringify(out instanceof type.errors ? out.issues : out))

const Alike = type({ ip: "string.ip" })
const Unlike = type({ id: "string.uuid | string.email" })

printIssues(Alike({ ip: "x" }))
printIssues(Alike({ ip: 1 }))
printIssues(Unlike({ id: "x" }))
console.log(JSON.stringify(Alike["~standard"].validate({ ip: "x" })))
console.log(JSON.stringify(Unlike["~standard"].validate({ id: 1 })))
`

		it("reads as arktype's, whether its branches can only fail alike or not", async () => {
			const root = fixture(
				"union-issue",
				`import { type } from "arktype"\n\n${printed}${repaying}\n`
			)
			const written = behaviorOf(await bundle(root, smallest))
			attest(written).equals(behaviorOf(await bundle(root)))
			attest(written)
				.snap(`[{"code":"union","path":["ip"],"data":"x","errors":[{"code":"pattern","path":["ip"],"data":"x","expected":"an IP address","message":"ip must be an IP address"},{"code":"pattern","path":["ip"],"data":"x","expected":"an IP address","message":"ip must be an IP address"}],"message":"ip must be an IP address","expected":"ip must be an IP address"}]
[{"code":"union","path":["ip"],"data":1,"errors":[{"code":"domain","path":["ip"],"data":1,"expected":"an IP address","message":"ip must be an IP address"},{"code":"domain","path":["ip"],"data":1,"expected":"an IP address","message":"ip must be an IP address"}],"message":"ip must be an IP address","expected":"ip must be an IP address"}]
[{"code":"union","path":["id"],"data":"x","errors":[{"code":"pattern","path":["id"],"data":"x","expected":"an email address","message":"id must be an email address"},{"code":"pattern","path":["id"],"data":"x","expected":"a UUID","message":"id must be a UUID"}],"message":"id must be an email address or a UUID","expected":"id must be an email address or a UUID"}]
{"issues":[{"code":"union","path":["ip"],"data":"x","errors":[{"code":"pattern","path":["ip"],"data":"x","expected":"an IP address","message":"ip must be an IP address"},{"code":"pattern","path":["ip"],"data":"x","expected":"an IP address","message":"ip must be an IP address"}],"message":"must be an IP address","expected":"ip must be an IP address"}]}
{"issues":[{"code":"union","path":["id"],"data":1,"errors":[{"code":"domain","path":["id"],"data":1,"expected":"a string","message":"id must be a string"},{"code":"domain","path":["id"],"data":1,"expected":"a UUID","message":"id must be a UUID"}],"message":"must be a string or a UUID","expected":"id must be a string or a UUID"}]}
`)
		})
	})

	it("reads a domain or null as arktype does", async () => {
		const root = fixture(
			"nullable",
			`import { type } from "arktype"

const T = type({
	plain: "string | null",
	refined: "(string > 1) | null",
	count: "(number >= 1) | null",
	flag: "boolean | null",
	object: type({ a: "string" }).or("null"),
	written: type({ a: "number = 1" }).or("null")
})
const print = (data: unknown) => {
	const out = T(data)
	console.log(out instanceof type.errors ? out.summary : JSON.stringify(out))
}
print({ plain: null, refined: null, count: null, flag: null, object: null, written: null })
print({ plain: "a", refined: "ab", count: 1, flag: true, object: { a: "a" }, written: {} })
print({ plain: 1, refined: "a", count: 0, flag: 1, object: 1, written: 1 })
print({ plain: {}, refined: 1, count: "a", flag: "a", object: {}, written: { a: "a" } })
${repaying}
`
		)
		const written = await bundle(root, smallest)
		attest(written.includes("nullable(")).equals(true)
		attest(behaviorOf(written)).equals(behaviorOf(await bundle(root)))
	})

	it("reads type.errors as the class it holds, even from a site", async () => {
		const root = fixture(
			"errors-class",
			`import { type } from "arktype"

const isErrors = (out: unknown) => out instanceof type.errors
const T = type("string").narrow(s => !(s instanceof type.errors))

console.log(isErrors(T(1)), isErrors(T("a")), typeof type?.errors)
${repaying}
`
		)
		attest(behaviorOf(await bundle(root, smallest))).snap(
			"true false function\n"
		)
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

		it("answers allows true whatever truthy value it returned", async () => {
			const root = fixture(
				"truthy",
				`import { type } from "arktype"
const yes = ((s: any) => (s.length > 1 ? "yes" : 0)) as any
const generates = function* (s: string) {
	yield s
} as any
const Alone = type("unknown").narrow(yes)
const Narrowed = type("string").narrow(yes)
const Twice = type("string").narrow(yes).narrow(s => s.length < 9)
const Piped = type("string")
	.narrow(yes)
	.pipe(s => s.length)
const Generates = type("string").narrow(generates)
const Either = Narrowed.or("number")
console.log(
	[Alone, Narrowed, Twice, Piped, Generates, Either].map(t => [
		t.allows("abc"),
		t.allows("a")
	])
)
${repaying}
`
			)
			const checkers = await bundle(root, smallest)
			attest(checkers.includes("narrowedBy(")).equals(true)
			const expected = `[
  [ true, false ],
  [ true, false ],
  [ true, false ],
  [ true, false ],
  [ true, true ],
  [ true, false ]
]
`
			attest(behaviorOf(checkers)).equals(expected)
			attest(behaviorOf(await bundle(root))).equals(expected)
			attest(behaviorOf(await bundle(root, { optimize: "size" }))).equals(
				expected
			)
			attest(
				behaviorOf(await bundle(root, { ...smallest, prune: false }))
			).equals(expected)
		})

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
			attest(/\bclass Traversal\b/.test(js)).equals(false)
		})
	})

	describe("a narrow that reaches its ctx only to return what it reports", () => {
		// the same callback either way: holding its ctx leaves it unproved
		const reporting = (returns: string): [string, string, string] => [
			`function (s: string, ctx: any) { globalThis.calls++; return ${returns} }`,
			`function (s: string, ctx: any) { const held = ctx; globalThis.calls++; return ${returns.replace("ctx.", "held.")} }`,
			"narrowedWithCtx("
		]
		const long = "s.length > (globalThis.limit ?? 2)"

		it("is compiled as arktype compiles it in cache mode, which reads no proof", async () => {
			const [narrow] = reporting(`${long} || ctx.mustBe("long")`)
			const js = await bundle(
				fixture(
					"cache-mode",
					`import { type } from "arktype"

const N = type("string").narrow(${narrow})
globalThis.calls = 0
console.log(String(N("x")), N.allows("x"), String(type({ a: N })({ a: "x" })), globalThis.calls)
`
				),
				{ runtime: "arktype" }
			)
			// a node's and what holds it: a unit keyed by flags arktype's node won't
			// have is one nothing reads, so isn't written
			attest(js.split("~arktype/units/").length - 2).equals(2)
			attest(behaviorOf(js)).equals(
				'must be long (was "x") false a must be long (was "x") 5\n'
			)
		})

		itRunsAsUnproved(
			"runs as often at each depth, reporting where it fails",
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
run(() => N("x"))
run(() => N.allows("x"))
`,
			reporting(`${long} || ctx.mustBe("long")`)
		)

		itRunsAsUnproved(
			"runs as often in each kind of union, and above a morph",
			`const Nullable = type({ v: N.or("null") })
run(() => Nullable({ v: "x" }))
run(() => Nullable({ v: null }))
const Keyed = type({ k: "'a'", v: N }).or({ k: "'b'", v: N, w: N })
run(() => Keyed({ k: "b", v: "x", w: "y" }))
run(() => Keyed({ k: "c", v: "x" }))
const Unkeyed = type({ k: "'a'", v: N, w: N }).or({ v: "number", w: N })
run(() => Unkeyed({ k: "a", v: "x", w: "y" }))
run(() => Unkeyed({ v: 1, w: "abc" }))
const Piped = N.pipe(s => s.length)
run(() => Piped("abc"))
run(() => Piped("x"))
const Above = type({ p: Piped, q: N })
run(() => Above({ p: "abc", q: "abc" }))
run(() => Above({ p: "x", q: "x" }))
`,
			reporting(
				`${long} ? true : ctx.reject({ problem: \`short by \${3 - s.length}\` })`
			)
		)

		itRunsAsUnproved(
			"reports only where it runs with a ctx, leaving what it returns falsy alone",
			`const T = type({ s: N })
run(() => T({ s: "abcdef" }))
run(() => T({ s: "abc" }))
run(() => T({ s: "x" }))
run(() => T.allows({ s: "abc" }))
`,
			reporting(`s.length > 2 && (s.length > 4 || ctx.mustBe("longer"))`)
		)

		for (const errors of ["first", "none"] as const) {
			it(`behaves as unproved with errors "${errors}"`, async () => {
				const source = `const T = type({ a: N, b: { c: N } })
run(() => T({ a: "abc", b: { c: "abc" } }))
run(() => T({ a: "x", b: { c: "x" } }))
run(() => T.allows({ a: "x", b: { c: "abc" } }))
`
				const [provedForm, unprovedForm] = reporting(
					`${long} || ctx.mustBe("long")`
				)
				const of = async (form: string, dir: string) =>
					behaviorOf(
						await bundle(fixture(`${errors}-${dir}`, appOf(form, source)), {
							errors
						})
					)
				attest(await of(provedForm, "proved")).equals(
					await of(unprovedForm, "unproved")
				)
			})
		}

		for (const [name, narrow] of Object.entries({
			"ignoring what it returns": `function (s: string, ctx: any) { if (s.length > 2) return true; ctx.reject({ problem: "short" }); return true }`,
			"holding what it returns": `function (s: string, ctx: any) { const reported = s.length > 2 || ctx.mustBe("long"); return reported }`,
			"before what it returns": `(s: string, ctx: any) => ctx.mustBe("long") || s.length > 2`,
			"in a function of its own": `(s: string, ctx: any) => [1].every(() => s.length > 2 || ctx.mustBe("long"))`,
			"through error, which returns what it adds": `(s: string, ctx: any) => s.length > 2 || ctx.error("long")`,
			"through a key it computes": `(s: string, ctx: any) => s.length > 2 || ctx["mustBe"]("long")`,
			"reading it for its report": `(s: string, ctx: any) => s.length > 2 || ctx.mustBe(ctx.path.join())`,
			"with a path a report can't spread": `(s: string, ctx: any) => s.length > 2 || ctx.reject({ relativePath: 1, problem: "short" })`,
			"as an async function, whose promise passes": `async (s: string, ctx: any) => s.length > 2 || ctx.mustBe("long")`,
			"past what arguments hold": `function (s: string, ctx: any) { return s.length > 2 || arguments[1].mustBe("long") }`
		})) {
			it(`reaches its ctx ${name}, so isn't proved`, async () => {
				const root = fixture(
					`reach-${name.replace(/\W+/g, "-")}`,
					appOf(
						narrow,
						`const tell = (f: () => unknown) => { try { console.log(String(f())) } catch (e) { console.log(e.constructor.name) } }
tell(() => type({ s: N })({ s: "abc" }).s)
tell(() => type({ s: N })({ s: "x" }))
tell(() => type({ s: N }).allows({ s: "x" }))
`
					)
				)
				const whole = behaviorOf(await bundle(root, { prune: false }))
				const js = await bundle(root, smallest)
				attest(js.includes("narrowedWithCtx(")).equals(false)
				attest(behaviorOf(await bundle(root))).equals(whole)
				attest(behaviorOf(js)).equals(whole)
			})
		}
	})

	describe("a morph", () => {
		const morphApp = (body: string) => `import { type } from "arktype"

const run = (f: () => unknown) => {
	globalThis.calls = []
	const out = f()
	console.log(out instanceof type.errors ? out.summary : JSON.stringify(out, (_, v) => v === undefined ? "undefined" : Object.is(v, -0) ? "-0" : v), globalThis.calls.join())
}
const trim = function (s: string) { globalThis.calls.push("trim:" + s); return s.trim() }
const N = type("number")
const parse = function (s: string) { globalThis.calls.push("parse:" + s); return N(Number(s)) }
const Trim = type("string").pipe(trim)
const Bounded = Trim.to("1 <= string <= 3")
const Parsed = type("string").pipe(parse)
const Positive = Parsed.to("number > 0")
${body}
${repaying}
`
		// a compiled build's messages lack what a value was, and in a lean bundle "value at"
		const expected = (plain: string) =>
			plain.replace(/ \(was [^)]*\)/g, "").replace(/value at \[/g, "[")

		const itRunsAsCompiled = (name: string, body: string) =>
			it(name, async () => {
				const root = fixture(
					`morph-${name.replace(/\W+/g, "-")}`,
					morphApp(body)
				)
				const compiled = behaviorOf(await bundle(root))
				attest(compiled).equals(expected(runPlain(root)))
				const checkers = await bundle(root, smallest)
				attest(checkers.includes("morphing(")).equals(true)
				attest(behaviorOf(checkers)).equals(compiled)
			})

		itRunsAsCompiled(
			"runs at each depth, once on data it allows and as it finds issues on data it doesn't",
			`const Deep = type({ a: Trim, "b?": Bounded, c: { d: Bounded, e: Trim.array() }, f: Bounded.array() })
const good = { a: " a ", c: { d: " d ", e: [" e "] }, f: [" f "] }
run(() => Deep(good))
run(() => good)
run(() => Deep({ ...good, b: "    " }))
run(() => Deep({ ...good, c: { d: " long long ", e: [1] } }))
run(() => Deep({ ...good, f: [" f ", "  ", " long long "] }))
run(() => Deep({ a: 1 }))
run(() => Deep({ ...good, a: 1 }))
run(() => Deep.allows({ ...good, f: 1 }))
run(() => Bounded("  "))
run(() => Trim(1))
`
		)

		itRunsAsCompiled(
			"writes what it returns, even undefined, null or -0",
			`const Nothing = type("string").pipe(() => undefined)
const Null = type("string").pipe(() => null)
const Zero = type("number").pipe(function (n) { return n === 1 ? -0 : n })
const Same = type("number").pipe(function (n) { return n })
run(() => Nothing("a"))
run(() => type({ a: Nothing, b: Null, "c?": Nothing })({ a: "a", b: "b", c: "c" }))
run(() => Nothing.or("number")("a"))
run(() => Null.or("number")("a"))
run(() => type({ k: "'a'", v: "string" }).pipe(() => null).or({ k: "'b'" })({ k: "a", v: "" }))
run(() => type({ n: Zero })({ n: 1 }))
run(() => Zero.array()([1]))
const unchanged = { n: Number.NaN }
run(() => type({ n: Same })(unchanged) === unchanged)
`
		)

		itRunsAsCompiled(
			"fails with what a morph returns, with or without a traversal",
			`const Deep = type({ a: Parsed, list: Parsed.array(), nested: { b: Parsed } })
run(() => Parsed("x"))
run(() => Deep({ a: "x", list: ["1", "x"], nested: { b: "x" } }))
run(() => Deep({ a: "x", list: 1, nested: { b: "x" } }))
const Mixed = type({ x: Parsed, y: Positive, z: Trim, "o?": Positive })
run(() => Mixed({ x: "1", y: "2", z: " z " }))
run(() => Mixed({ x: "a", y: "b", z: " z " }))
run(() => Mixed({ x: "a", y: "-1", z: " z ", o: "-2" }))
run(() => Mixed({ x: 1, y: "b", z: " z ", o: 1 }))
run(() => Positive.array()(["1", "x", "-1"]))
`
		)

		itRunsAsCompiled(
			"transforms its head first, running no step where it failed",
			`const Head = type({ a: Trim }).pipe(function (o) { globalThis.calls.push("head"); return { ...o, tagged: true } })
run(() => Head({ a: " a " }))
run(() => Head({ a: 1 }))
const Failing = type({ a: Parsed }).pipe(function (o) { globalThis.calls.push("after"); return o })
run(() => Failing({ a: "x" }))
const FailingCtx = type({ a: Positive }).pipe(function (o) { globalThis.calls.push("after"); return o })
run(() => FailingCtx({ a: "1" }))
run(() => FailingCtx({ a: "-1" }))
run(() => type({ d: "string = 'x'" }).pipe(function (o) { return o.d })({}))
run(() => type({ h: Head, f: FailingCtx })({ h: { a: " a " }, f: { a: "-1" } }))
const NoHead = type("unknown").pipe(function (v) { return [v] })
run(() => NoHead(1))
run(() => type({ v: NoHead })({}))
`
		)

		itRunsAsCompiled(
			"keeps a key's fate beside morphs where it rejects or deletes the undeclared",
			`const Closed = type({ "+": "reject", a: Trim, "b?": Bounded })
run(() => Closed({ a: " a ", b: "  " }))
run(() => Closed({ a: 1, c: 1 }))
const Deleting = type({ "+": "delete", a: Trim, "b?": Bounded })
run(() => Deleting({ a: " a ", c: 1 }))
run(() => Deleting({ a: " a ", b: "  ", c: 1 }))
class Holder { a = " a "; c = 1 }
run(() => { const out = Deleting(new Holder()); return [out instanceof Holder, Object.keys(out), out.a] })
const date = Object.assign(new Date(0), { a: " a " })
run(() => { const out = type({ a: Trim })(date); return [out === date, out.a] })
`
		)

		itRunsAsCompiled(
			"takes a union's branch, above and below what's compiled",
			`const Nullable = Trim.or("null")
run(() => Nullable(null))
run(() => type({ n: Nullable })({ n: 1 }))
const Keyed = type({ k: "'a'", v: Trim }).or({ k: "'b'", v: Bounded })
run(() => Keyed({ k: "a", v: " a " }))
run(() => Keyed({ k: "b", v: "  " }))
run(() => Keyed({ k: "c", v: " b " }))
run(() => type({ u: Keyed })({ u: { k: "b", v: "  " } }))
const Unkeyed = type("string > 3").pipe(trim).or(type("string < 2").pipe(function (s) { return s.length }))
const Above = type({ i: Unkeyed, t: Trim, b: Bounded, p: Parsed })
run(() => Above({ i: " a b ", t: " t ", b: " b ", p: "1" }))
run(() => Above({ i: "", t: " t ", b: "  ", p: "x" }))
run(() => Above({ i: 1, t: 1, b: 1, p: 1 }))
`
		)

		itRunsAsCompiled(
			"pipes to what transforms, or fails below its path",
			`const json = function (s: string) { return JSON.parse(s) }
const ToDefault = type("string").pipe(json).to({ d: "string = 'x'" })
run(() => ToDefault("{}"))
run(() => type({ t: ToDefault })({ t: '{"d":1}' }))
const ToMorph = type("string").pipe(json).to({ a: Trim, "b?": Bounded })
run(() => ToMorph('{"a":" a ","b":"  "}'))
run(() => type({ t: ToMorph, u: ToMorph.array() })({ t: '{"a":1}', u: ['{"a":1}', '{"a":" a "}'] }))
const Twice = Trim.to("string > 1").pipe(function (s) { return s.length }).to("number < 3")
run(() => Twice(" ab "))
run(() => type({ t: Twice })({ t: " abc " }))
const data = { e: "x" }
run(() => type("object").pipe(function (o) { return o }).to({ e: "string" })(data) === data)
`
		)

		itRunsAsCompiled(
			"reads a keyword's morph, a description and a configured message",
			`const K = type({ s: "string.trim", l: "string.lower" })
run(() => K({ s: " a ", l: "A" }))
run(() => K({ s: 1, l: "A" }))
const Tr = type("string.trim").to("1 <= string <= 3")
run(() => type({ t: Tr, "o?": Tr, l: Tr.array() })({ t: "    ", o: "    ", l: ["   ", "a"] }))
const Described = Trim.to("string > 1").describe("a long trimmed")
run(() => Described(" a "))
run(() => type({ m: Described })({}))
const Message = Bounded.configure({ message: "bad" })
run(() => Message("  "))
run(() => type({ m: Message })({ m: "  " }))
`
		)
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
const Env = type({ "+": "delete", a: "string" })
process.env.a = "abc"
process.env.kept = "1"
const fromEnv = Env(process.env)
console.log(fromEnv === process.env, JSON.stringify(fromEnv), process.env.kept)
class Tagged { a = "abc"; extra = 1; get [Symbol.toStringTag]() { return "T" } }
const tagged = new Tagged()
console.log(Env(tagged) === tagged, Object.keys(tagged))
`
		)
	})

	it("leaves a key a Type ignores, whatever the program's config does", async () => {
		const root = writeFixture(
			{
				"config.ts": `import { configure } from "arktype/config"

configure({ onUndeclaredKey: "delete" })
`,
				"main.ts": `import "./config.ts"
import { type } from "arktype"

export const Ignoring = type({ "+": "ignore", a: "string" })
export const Deleting = type({ a: "string" })
const data = { a: "a", z: 1 }
console.log(JSON.stringify(Ignoring(data)), Ignoring.allows(data))
console.log(JSON.stringify(Deleting(data)))
${repaying}
`
			},
			fromHere("temp", "checkers", "ignored")
		)
		attest(
			behaviorOf(await bundle(root, { ...smallest, config: "config.ts" }))
		).equals('{"a":"a","z":1} true\n{"a":"a"}\n')
	})

	it("transforms a key whose callback reads ctx, which sees the key's path", async () => {
		const root = fixture(
			"ctxUnderDeleting",
			`import { type } from "arktype"

const paths: unknown[] = []
const isValid = (value: unknown, ctx: any) => {
	paths.push([...ctx.path])
	return value !== "bad" || ctx.mustBe("valid")
}
const T = type({
	outer: { "+": "delete", v: type("string").narrow(isValid) },
	other: "number"
})
const Piped = type("string.json.parse").pipe(T)
const show = (out: unknown) =>
	console.log(
		out instanceof type.errors ?
			out.summary.replace(/ \\(was .*\\)/, "")
		:	JSON.stringify(out),
		JSON.stringify(paths.splice(0))
	)
show(T({ outer: { v: "a", extra: 1 }, other: 1 }))
show(T({ outer: { v: "bad" }, other: 1 }))
show(Piped('{ "outer": { "v": "bad" }, "other": 1 }'))
${repaying}
`
		)
		attest(behaviorOf(await bundle(root, smallest))).equals(runPlain(root))
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

	describe("a shape of many keys that may be absent", () => {
		const optionalKeys = Array.from(
			{ length: 48 },
			(_, i) => `"k${i}?": "string"`
		).join(", ")

		const app = (body: string) => `import { type } from "arktype"

const show = (out: unknown) =>
	console.log(
		out instanceof type.errors ?
			out.summary.replace(/ \\(was .*?\\)/g, "")
		:	[JSON.stringify(out), Object(out).constructor?.name, Object.keys(Object(out))]
	)
${body}
${repaying}
`

		const itWritesAsArktype = (name: string, body: string) =>
			it(name, async () => {
				const root = fixture(`sited-${name.replace(/\W+/g, "-")}`, app(body))
				const js = await bundle(root, smallest)
				attest(js.includes(" sited(")).equals(true)
				attest(behaviorOf(js)).equals(runPlain(root))
			})

		itWritesAsArktype(
			"deletes keys it doesn't declare, the rest in its order",
			`const T = type({ "+": "delete", a: "string", ${optionalKeys}, z: "number" })
show(T({ z: 1, k3: "x", a: "a", other: 1 }))
show(T({ a: "a", z: 1, k1: undefined }))
show(T({ a: 1, k47: 2 }))
show(T(1))
console.log(T.allows({ a: "a", z: 1, k47: 1 }), T.allows({ a: "a", z: 1, k47: "x" }), T.allows({ a: "a" }))
class Held { a = "a"; z = 1; k2 = "x"; other = 1 }
show(T(new Held()))
show(T(Object.create({ a: "a", z: 1, k4: "inherited" })))
show(T(Object.defineProperties({}, { a: { value: "a" }, z: { value: 1 }, k5: { value: "hidden" } })))`
		)

		const parsing = `const Bad = type("number")
const parsed = type("string").pipe(s => (s === "bad" ? Bad(s) : s.length))`

		itWritesAsArktype(
			"writes each default and transform where it deletes",
			`${parsing}
const T = type({
	"+": "delete",
	parsed,
	"maybeParsed?": parsed,
	literal: "number = 1",
	byFunction: type("string[]").default(() => ["x"]),
	nested: { "+": "delete", a: "string" },
	${optionalKeys}
})
show(T({ parsed: "1", other: 1, nested: { a: "a", b: 1 } }))
show(T({ parsed: "1", maybeParsed: "22", literal: 3, byFunction: [], k0: "x", nested: { a: "a" } }))
show(T({ parsed: "bad", nested: { a: "a" } }))
show(T({ parsed: "bad", maybeParsed: "bad", nested: { a: "a" } }))
show(T({ parsed: "1", nested: {} }))
const Literal = type({ "+": "delete", literal: "number = 1", "nested?": { "+": "delete", a: "string" }, ${optionalKeys} })
show(Literal({ other: 1, nested: { a: "a", b: 1 }, k1: "x" }))
show(Literal({ literal: 2 }))
class Held { parsed = "1"; other = 1; nested = { a: "a", b: 1 } }
const held = T(new Held())
show(held)`
		)

		itWritesAsArktype(
			"only transforming what can change without deleting",
			`${parsing}
const Parsing = type({ parsed, "maybeParsed?": parsed, byFunction: type("string[]").default(() => ["x"]), ${optionalKeys} })
const Literal = type({ literal: "number = 1", ${optionalKeys} })
const data = { parsed: "1", other: 1, k3: "x" }
show(Parsing(data))
show(Parsing({ parsed: "bad" }))
const hidden = Object.defineProperty({ other: 1 }, "k3", { value: "hidden" })
const out: any = Literal(hidden)
show(out)
console.log(out.k3, out === hidden)
const full = { literal: 2, k1: "x" }
console.log(Literal(full) === full)`
		)

		itWritesAsArktype(
			"rejects keys it doesn't declare",
			`const T = type({ "+": "reject", a: "string", ${optionalKeys} })
show(T({ a: "a", k1: "x" }))
show(T({ a: "a", other: 1 }))
console.log(T.allows({ a: "a", k1: "x" }), T.allows({ a: "a", other: 1 }), T.allows(Object.create({ other: 1, a: "a" })))`
		)

		itWritesAsArktype(
			"finds what's present as arktype does, reading no further than a failure",
			`const T = type({ a: "string", u: "string | undefined", "a-b?": "number", "class?": "number", ${optionalKeys} })
const present = { a: "a", u: undefined }
console.log(T.allows(present), T.allows({ a: "a" }), T.allows({ a: "a", u: "u", "a-b": 1, class: 1 }), T.allows({ a: "a", u: "u", "a-b": "x" }), T.allows({ a: "a", u: "u", class: "x" }))
show(T({ a: "a" }))
console.log(T.allows(Object.create({ ...present, k1: 1 })), T.allows({ ...present, k1: undefined }))
console.log(T.allows(Object.defineProperty({ ...present }, "k2", { value: 1 })))
console.log(T.allows(new Proxy({ ...present }, { has: (data, k) => k === "k3" || k in data, get: (data, k) => k === "k3" ? 1 : (data as any)[k] })))
console.log(T.allows({ a: 1, u: "u", get k0(): string { throw new Error("read past a failure") } }))`
		)

		it("writes a default replacing undefined where config says it does", async () => {
			const root = writeFixture(
				{
					"config.ts": `import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })
`,
					"main.ts": `import "./config.ts"
${app(`const T = type({ "+": "delete", literal: "number = 1", byFunction: type("string[]").default(() => ["x"]), "maybe?": "string", ${optionalKeys} })
show(T({}))
show(T({ literal: undefined, byFunction: undefined, maybe: undefined, k1: undefined }))
show(T({ literal: 2, byFunction: [], maybe: "x", k1: "y" }))
show(T({ literal: "x" }))`)}`
				},
				fromHere("temp", "checkers", "sited-config")
			)
			const js = await bundle(root, { ...smallest, config: "config.ts" })
			attest(js.includes(" sited(")).equals(true)
			attest(behaviorOf(js)).equals(runPlain(root))
		})
	})
})
