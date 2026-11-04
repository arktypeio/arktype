import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"
import { run, runPlain, writeFixture } from "./utils.ts"

// a build's validators write a union's text as arktype does, but for what no
// message of theirs says: what the value was, and `value at` before a bracket

// arktype's packages resolve to their source in this repo
const source = ["ark-ts"]
const production = ["ark-ts", "production"]

const behaviors: Record<string, string> = {
	"lists what each branch's first issue expected, by its path": `
		show(type({ a: "string", b: "string" }).or({ c: "string" }), {}, { a: 1 }, { a: "", b: 1 }, { c: 1 }, 1, null)
		show(type("Date").or("RegExp").or({ a: "string" }), 1, {})
		show(type("string[]").or("number[]"), 1, [true], ["a", 1])
		show(type(["string", "number"]).or(["number"]), [], [1, 2])
		show(type({ a: "string", "+": "reject" }).or({ b: "string", "+": "reject" }), { a: "", b: "" })
		show(type({ "a.b": "string" }).or({ 0: "string" }), {})
		show(type({ a: "string" }).or({ a: "string", b: "number" }), {}, { a: 1 })
	`,
	"lists a union below the one failing": `
		const Inner = type({ a: "string" }).or({ b: "string" })
		show(Inner.array(), [{}], [1, {}])
		show(type({ k: Inner }), { k: {} }, { k: 1 }, {})
		show(type({ "k?": Inner }), { k: {} }, { k: 1 }, {})
		show(type({ "[string]": Inner }), { k: {}, l: 1 })
		show(type([Inner, "...", "number[]"]), [{}], [1, "a"])
		show(type({ x: { y: Inner } }), { x: { y: {} } }, { x: {} })
		show(type({ x: Inner }).or({ y: Inner }), {}, { x: {} }, { x: {}, y: {} })
		show(type({ x: Inner, y: Inner }), { x: {}, y: {} })
	`,
	"lists the alternatives of a branch beside another's at one path": `
		show(type({ a: "string|number" }).or({ a: "boolean", b: "string" }), {}, { a: null })
		show(type({ v: "'a'|'b'" }).or({ v: "'c'", w: "number" }).or({ w: "string" }), {}, { v: 1 })
		show(type({ v: "'a, b'|'c or d'" }).or({ v: "number", w: "number" }), { v: true }, {})
		show(type({ v: "boolean" }).or({ v: "string", w: "number" }), {}, { v: 1 })
		show(type({ d: type({ k: "'x'", a: "string" }).or({ k: "'y'", b: "string" }) }).or({ d: "string", w: "number" }), {}, { d: {} }, { d: { k: "z" } })
	`,
	"keeps a date's text whole beside another's at one path": `
		show(type({ d: "Date > d'2000-01-01'" }).or({ d: "Date < d'1999-01-01'", e: "string" }), { d: new Date("1999-06-01") })
	`,
	"expects what's listed of a union of bases": `
		const Bases = type("Date|RegExp")
		show(Bases, 1)
		show(type({ o: Bases }), { o: 1 }, {})
		show(type({ "o?": Bases }), { o: 1 })
		show(type({ o: Bases }).or({ p: "string" }), { o: 1 }, {})
		show(type("Date").configure({ expected: "a day" }).or("RegExp"), 1)
		show(type({ o: type("Date").configure({ expected: "a day" }).or("RegExp") }), { o: 1 }, {})
		show(type("Date").configure({ message: "no day" }).or("RegExp"), 1)
		show(type("Date").configure({ problem: "no day" }).or("RegExp"), 1)
	`,
	"lists a morph's input beside what else a union misses": `
		const toString = (v: unknown) => String(v)
		show(type(["string | number", "=>", toString]).or(["object", "@", "a box"]), null, true)
		show(type([[["string", "@", "a thing"], "|", "number"], "=>", toString]).or("object"), null, true)
		show(type({ "x?": "string" }).or([["5n | -0.5", "=>", toString], "@", "a thing"]), -0, true)
		show(type(["string | number", "=>", toString]).or("object").or("null"), true, undefined)
	`,
	"reports a union of no branches as its own": `
		show(type({ a: "never" }).or({ b: "string" }), {}, { a: 1 })
	`,
	"writes a union's own text, unless another lists it": `
		${[
			`{ description: "a thing" }`,
			`{ expected: "A or B" }`,
			`{ problem: "bad" }`,
			`{ message: "whole" }`,
			`{ description: "a thing", expected: "E" }`,
			`{ description: "a thing", message: "whole" }`,
			`{ actual: "that" }`
		]
			.map(meta => {
				const own = `type({ a: "string" }).or({ b: "string" }).configure(${meta})`
				return `
					show(${own}, {})
					show(type({ k: ${own} }), { k: {} }, { k: 1 }, {})
					show(type({ k: ${own} }).or({ z: "string" }), { k: {} }, {})`
			})
			.join("\n")}
		const Described = type("Date|RegExp").describe("a thing")
		show(Described, 1)
		show(type({ k: Described }), { k: 1 })
		show(type({ k: Described }).or({ z: "string" }), { k: 1 })
		const Expected = type("Date|RegExp").configure({ expected: "E" })
		show(Expected, 1)
		show(type({ k: Expected }), { k: 1 })
		const Discriminated = type({ k: "'x'", a: "string" }).or({ k: "'y'", b: "string" }).configure({ expected: "E" })
		show(Discriminated, {}, { k: "z" }, { k: "x" }, 1)
		show(type({ o: Discriminated }), { o: {} }, { o: 1 })
		const DomainDescribed = type("string|number").describe("a thing")
		show(type({ v: DomainDescribed }), {}, { v: null })
		show(type({ v: DomainDescribed }).or({ w: "number" }), {}, { v: null })
	`,
	"lists a default case beside its miss": `
		const Partly = type({ k: "'a'", v: "string" }).or({ k: "'b'" }).or({ z: "number" })
		show(Partly, {}, { k: "c" }, { k: "a" }, { k: "c", z: "x" }, { z: "x" }, 1, null)
		show(type({ o: Partly }), { o: {} }, { o: { k: "c" } }, { o: 1 }, {})
		show(Partly.describe("a part"), {}, { k: "c" }, { k: "a" }, 1)
		show(type({ a: "string", k: "'a'" }).or({ a: "string", k: "'b'" }).or({ z: "number" }), {}, { a: "x" }, { a: 1, k: "c" }, 1)
		show(type({ k: "'a'" }).or({ k: "'b'" }).or("string"), {}, 1, { k: "c" })
		show(type({ o: { k: "'a'" } }).or({ o: { k: "'b'" } }).or({ z: "number" }), {}, { o: 1 }, { o: {} }, { o: { k: "c" } }, { z: "x" }, 1)
		show(type("string").or({ a: "string" }).or(type("number[]")), 1, {}, { a: 1 }, [null], null)
	`,
	"lists a described branch where a miss would": `
		show(type({ k: "'a'" }).describe("A").or({ k: "'b'" }), {}, { k: "c" }, 1)
		show(type("'a'").describe("A").or("'b'").or("string[]"), "c", 1, [1])
	`,
	"lists what a narrow in a branch raises": `
		show(type({ a: type("string").narrow(function raisesNothing(s, ctx) { return ctx.reject({}) }) }).or({ b: "string" }), { a: "x" })
		show(type({ a: type("string").narrow(function raisesProblem(s, ctx) { return ctx.reject({ problem: "bad" }) }) }).or({ b: "string" }), { a: "x" })
		show(type({ a: type("string").narrow(function raisesMessage(s, ctx) { return ctx.reject({ message: "whole" }) }) }).or({ b: "string" }), { a: "x" })
		show(type({ a: type("string").narrow(function raisesExpected(s, ctx) { return ctx.mustBe("long") }) }).or({ b: "string" }), { a: "x" })
		show(type({ a: type("string").narrow(function failsIt() { return false }) }).or({ b: "string" }), { a: "x" })
		show(type({ a: type("string").narrow(function reaches(s, ctx) { return ctx.reject({ problem: "deep", path: ["d"] }) }) }).or({ b: "string" }), { a: "x" })
		show(type("string").narrow(function bare(s, ctx) { return ctx.reject({}) }), "a")
	`,
	"runs a narrow in a branch as often as arktype": `
		const counted = (s: string, ctx: any) => (globalThis.calls++, s.length > 3 || ctx.mustBe("long"))
		const Counted = type("string").narrow(counted)
		const bare = (s: string) => (globalThis.calls++, s.length > 3)
		const Bare = type("string").narrow(bare)
		const count = (t: any, ...inputs: unknown[]) => {
			for (const input of inputs) {
				globalThis.calls = 0
				show(t, input)
				console.log(index, globalThis.calls)
			}
		}
		${["Counted", "Bare"]
			.map(
				N => `
					count(type({ a: ${N} }).or({ b: ${N} }), { a: "x" }, { b: "x" }, { a: "xxxx" }, { a: "x", b: "x" }, {})
					count(type({ k: "'a'" }).or({ z: ${N} }), { z: "x" }, { z: "xxxx" }, { k: "c", z: "x" }, 1)
					count(type({ o: type({ a: ${N} }).or({ b: ${N} }) }), { o: { a: "x" } }, { o: { b: "xxxx" } })
					count(${N}.or("number"), "x", 1, null)`
			)
			.join("\n")}
	`,
	"prefixes the union whose errors a morph returns": `
		const Inner = type({ a: "string" }).or({ b: "string" })
		const Returned = type("string").pipe(s => Inner(JSON.parse(s)))
		show(Returned, "{}")
		show(type({ p: Returned }), { p: "{}" })
		const Called = type("string").pipe((s, ctx) => (Inner as any)(JSON.parse(s), ctx))
		show(type({ p: Called }), { p: "{}" })
		const To = type("string.json.parse").to(Inner)
		show(type({ p: To }), { p: "{}" })
	`,
	"writes the union a Standard Schema consumer prefixes as if validated alone": `
		const Inner = type({ a: "string" }).or({ b: "string" })
		standard(type({ o: Inner }), { o: {} })
		standard(type({ o: type({ q: { a: "string" } }).or({ q: { b: "string" } }) }), { o: { q: {} } })
		standard(type({ o: type({ q: { a: "string" } }).or({ r: { b: "string" } }) }), { o: {} })
		standard(type({ o: "string|number" }), { o: null })
		standard(type({ p: type("string").pipe(s => Inner(JSON.parse(s))) }), { p: "{}" })
		standard(type({ k: Inner.configure({ description: "a thing" }) }), { k: {} })
		standard(type({ k: Inner.configure({ expected: "E" }) }), { k: {} })
		standard(type({ k: Inner.configure({ problem: "bad" }) }), { k: {} })
		standard(type({ k: Inner.configure({ message: "whole" }) }), { k: {} })
	`,
	"holds each branch's first issue": `
		const listing = (t: any, input: unknown) =>
			console.log(index, JSON.stringify(t(input).issues.map((issue: any) => [issue.code, issue.path, issue.expected, issue.message, issue.errors.map((e: any) => [e.code, e.path, e.expected, e.message])])))
		listing(type({ o: type({ q: { a: "string" } }).or({ r: { b: "string" } }) }), { o: {} })
		listing(type({ a: "string" }).or({ b: "string" }), {})
	`
}

const appOf = (rows: Record<string, string>) => `import { type } from "arktype"

const standard = (t: any, input: unknown) =>
	console.log(index, JSON.stringify(t["~standard"].validate(input).issues.map((issue: any) => [issue.message, issue.path])))
const show = (t: any, ...inputs: unknown[]) => {
	for (const input of inputs) {
		const out = t(input)
		console.log(index, JSON.stringify([input, out instanceof type.errors ? out.summary : "ok"]))
	}
}
let index = 0
${Object.values(rows)
	.map(row => `{\n${row}\nindex++\n}`)
	.join("\n")}
// a build chooses compiled code for a program too small to repay checkers
${Array.from(
	{ length: 30 },
	(_, i) =>
		`export const F${i} = type({ a${i}: "string > ${i}", b${i}: "number > ${i}", c${i}: "string < ${i + 9}" })`
).join("\n")}
`

const bundle = async (
	root: string,
	conditions: string[],
	opts: PrecompileUnpluginOptions = {}
) => {
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

const withoutValues = (text: string) =>
	text.replace(/ \(was [^)]*\)/g, "").replace(/value at /g, "")

const rowsOf = (out: string, index: number) =>
	out.split("\n").filter(line => line.startsWith(`${index} `))

contextualize(function (this: Mocha.Suite) {
	this.timeout(600_000)

	const root = writeFixture(
		{ "main.ts": appOf(behaviors) },
		fromHere("temp", "unionText", "behaviors")
	)
	const builds: [string, string][] = []
	let plain: string

	before(async () => {
		plain = withoutValues(runPlain(root))
		builds.push(
			["production", run(await bundle(root, production))],
			["smallest", run(await bundle(root, production, { preset: "smallest" }))],
			["size", run(await bundle(root, production, { optimize: "size" }))],
			["module alone", run(await bundle(root, production, { prune: false }))],
			["source", run(await bundle(root, source))]
		)
	})

	for (const [index, behavior] of Object.keys(behaviors).entries()) {
		it(behavior, () => {
			const expected = rowsOf(plain, index)
			attest(expected.length > 0).equals(true)
			for (const [name, out] of builds)
				attest([name, ...rowsOf(out, index)]).equals([name, ...expected])
		})
	}

	const rowOf = async (name: string, row: string) => {
		const rooted = writeFixture(
			{ "main.ts": appOf({ [name]: row }) },
			fromHere("temp", "unionText", name.replace(/\W/g, ""))
		)
		return rowsOf(run(await bundle(rooted, production)), 0)
	}

	// each that's documented, as what a build can't tell from text alone
	it("lists a description holding `or` as its alternatives beside another's", async () => {
		const Described = `type("string|number").describe("a thing or other")`
		const row = `show(type({ v: ${Described} }).or({ v: "boolean", w: "number" }), { v: null })`
		attest(await rowOf("description", row)).snap([
			'0 [{"v":null},"v must be boolean, a thing or other"]'
		])
	})

	it("lists a code a narrow raises without text as valid", async () => {
		const row = `show(type({ a: type("string").narrow((s, ctx) => ctx.reject({ code: "minLength", rule: 5 } as never)) }).or({ b: "string" }), { a: "x" })`
		attest(await rowOf("code", row)).snap([
			'0 [{"a":"x"},"a must be valid or b must be a string"]'
		])
	})

	it("expects a union of bases without `must be`", async () => {
		const row = `console.log(index, type("Date|RegExp")(1).issues[0].expected)`
		attest(await rowOf("bases", row)).snap(["0 a Date or a RegExp"])
	})
})
