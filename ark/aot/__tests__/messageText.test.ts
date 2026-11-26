import { attest, contextualize } from "@ark/attest"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"
import { run, runPlain, tempPath, writeFixture } from "./utils.ts"

// a build's validators tell a sentence configured or supplied for an error
// from text written from what it expected exactly as arktype does: by the
// message alone, which a summary sets apart from its path unless it begins as
// what arktype would have written, and by whether it was its code's, which a
// union's errors don't share

const production = ["ark-ts", "production"]

const told: Record<string, string> = {
	"writes a message configured as arktype's own text after its path, as that is": `
		const AsDefault = type("string").configure({ message: "must be a string" })
		show(type({ k: AsDefault }), { k: 1 })
		show(AsDefault, 1)
		show(type({ k: type("string").configure({ message: "must be a string, not that" }) }), { k: 1 })
		standard(type({ k: AsDefault }), { k: 1 })
	`,
	"writes what a function wrote from the error after its path where it begins so": `
		const Templated = type("string").configure({ message: ctx => \`must be \${ctx.expected} (was \${ctx.actual})\` })
		show(type({ k: Templated }), { k: 1 }, {})
		show(type({ k: type("string").configure({ message: ctx => \`Enter \${ctx.expected}\` }) }), { k: 1 })
		show(type({ k: type("number").configure({ actual: "wrong" }) }), { k: "a" })
		show(type({ k: type("number").configure({ actual: data => typeof data }) }), { k: "a" })
		show(type({ k: type("string").configure({ expected: "text" }) }), { k: 1 }, {})
	`,
	"sets apart a sentence, what's expected alone and what another expectation would begin": `
		show(type({ k: type("string").configure({ message: "Enter text" }) }), { k: 1 }, {})
		show(type({ k: type("string").configure({ message: "a string" }) }), { k: 1 })
		show(type({ k: type("string").configure({ message: "must be text" }) }), { k: 1 })
	`,
	"reads a missing key's message against what a missing key expects": `
		show(type({ k: type("string").configure({ message: "must be a string" }) }), {})
		show(type({ k: type("string").configure({ message: "must be a string (was missing)" }, "self") }), {}, { k: 1 })
	`,
	"reads a message supplied where it's raised against what was supplied as expected": `
		show(type({ k: type("string").narrow((s, ctx) => ctx.reject({ message: "must be shorter" })) }), { k: "a" })
		show(type({ k: type("string").narrow((s, ctx) => ctx.reject({ expected: "shorter", message: "must be shorter" })) }), { k: "a" })
		show(type({ k: type("string").narrow((s, ctx) => ctx.reject({ expected: "shorter", message: "must be shorter than that" })) }), { k: "a" })
		show(type({ k: type("string").narrow((s, ctx) => ctx.reject({ expected: "shorter", actual: "long" })) }), { k: "a" })
		show(type({ k: type("string").narrow((s, ctx) => ctx.reject({ message: "Too long" })) }), { k: "a" })
	`,
	"says a keyword's message, and expects what it's described as, in the error the keyword raises": `
		show(type({ k: type("string.json").message("Enter JSON") }), { k: "{" }, { k: 1 }, {})
		show(type({ k: type("string.url.parse").message("must be a URL string, not that") }), { k: "!!" })
		show(type({ k: type("string.date.parse").describe("a day") }), { k: "!!" }, { k: 1 })
		show(type("string.json.parse").describe("a body"), "{")
		show(type({ k: type("string.json").describe("a body") }), { k: "{" })
		show(type({ k: type("string.regex").describe("a pattern").message("Enter a pattern") }), { k: "(" })
		show(type({ k: type("string.integer.parse").message("Enter a count") }), { k: "9007199254740993" })
		show(type({ k: type("string.date.epoch").describe("a send time") }), { k: "99999999999999999999" })
		show(type({ k: type("string.date.epoch").message("Enter a time") }), { k: "99999999999999999999" })
		show(type({ k: type("string.json").message("Enter a link").or(type("string.url").message("Enter a link")) }), { k: "!!" })
		show(type({ k: type("string.json").describe("a body").or("string.url") }), { k: "!!" })
		show(type({ k: type("string.json.parse").describe("a body").label("K") }), { k: "{" })
		show(type({ k: type("string.json").label("K").message("Enter JSON") }), { k: "{" })
		standard(type({ k: type("string.json").message("Enter JSON") }), { k: "{" })
	`,
	"leaves what a narrow or morph of the program's says is expected": `
		const Foo = type("string").narrow((s, ctx) => s === "foo" || ctx.mustBe("a foo"))
		show(type({ k: Foo.message("Enter a foo") }), { k: "x" }, { k: 1 })
		show(type({ k: Foo.describe("a thing") }), { k: "x" })
		show(type({ k: type("string").pipe((s, ctx) => ctx.error("a product")).describe("a thing") }), { k: "x" })
	`,
	"lists a union's errors whose messages begin as arktype's own, and says a sentence they share": `
		const AsDefault = type("string").configure({ message: "must be a string" })
		const Enter = type("string").configure({ message: "Enter text" })
		show(type({ a: AsDefault }).or({ b: AsDefault }), { a: 1, b: 1 }, {})
		show(type({ k: type({ a: AsDefault }).or({ b: AsDefault }) }), { k: { a: 1, b: 1 } })
		show(type({ a: Enter }).or({ b: Enter }), { a: 1, b: 1 }, {})
		show(type({ a: Enter }).or({ b: AsDefault }), { a: 1, b: 1 })
	`,
	"reads a union's own message against what it's configured to expect": `
		const Either = type({ a: "string" }).or({ b: "string" })
		show(type({ k: Either.configure({ message: "must be E", expected: "E" }) }), { k: {} })
		show(type({ k: Either.configure({ message: "must be E" }) }), { k: {} })
		show(type({ k: Either.configure({ message: "Pick one" }) }), { k: {} })
	`,
	"keeps each through a pipe and the validator a morph calls": `
		const AsDefault = type("string").configure({ message: "must be a string" })
		const Enter = type("string").configure({ message: "Enter text" })
		show(type({ k: AsDefault }).pipe(o => o), { k: 1 })
		show(type({ p: type("string").pipe(s => type({ k: AsDefault })(JSON.parse(s))) }), { p: '{"k":1}' })
		show(type({ p: type("string").pipe(s => type({ k: Enter })(JSON.parse(s))) }), { p: '{"k":1}' })
		show(type({ p: type("string.json.parse").to({ k: Enter }) }), { p: '{"k":1}' })
	`
}

// each message here is configured for its code, in config.ts
const coded: Record<string, string> = {
	"sets a code's message apart from its path": `
		show(type({ k: "string" }), {}, { k: 1 })
		show(type({ k: "string <= 3" }), { k: "abcd" })
	`,
	"writes what a code's function wrote after its path where it begins as arktype's own": `
		show(type({ k: "string >= 3" }), { k: "a" })
	`,
	"lists a union's errors that say a code's message, though they say the same": `
		show(type({ a: "string" }).or({ b: "string" }), {}, { a: 1, b: 1 }, { a: 1 })
		show(type({ k: type({ a: "string" }).or({ b: "string" }) }), { k: {} }, {})
		show(type({ a: "string <= 3" }).or({ b: "string <= 3" }), { a: "abcd", b: "abcd" })
		show(type({ a: "string >= 3" }).or({ b: "string >= 3" }), { a: "a", b: "b" })
	`,
	"says the same text for a union's errors where it's each one's Type's": `
		const Wrong = type("string").configure({ message: "Wrong type" })
		show(type({ a: Wrong }).or({ b: Wrong }), { a: 1, b: 1 }, {})
		show(type({ a: Wrong }).or({ b: "string" }), { a: 1, b: 1 }, {})
	`,
	"lists errors a callback raised by a code that say its message": `
		const raises = (s: string, ctx: any) => ctx.reject({ code: "divisor", rule: 2 })
		show(type({ k: type("string").narrow(raises) }), { k: "x" })
		show(type({ a: type("string").narrow(raises) }).or({ b: type("string").narrow(raises) }), { a: "x", b: "x" })
	`,
	"keeps a code's message through the validator a morph calls": `
		const Inner = type({ k: "string" })
		show(type({ p: type("string").pipe(s => Inner(JSON.parse(s))) }), { p: "{}" })
		show(type({ p: type("string").pipe((s, ctx) => (Inner as any)(JSON.parse(s), ctx)) }), { p: "{}" })
	`
}

const config = `import { configure } from "arktype/config"

configure({
	required: { message: "Required" },
	domain: { message: "Wrong type" },
	divisor: { message: "Not even" },
	minLength: { message: ctx => \`must be \${ctx.expected} (was \${ctx.actual})\` },
	maxLength: { message: ctx => \`Too long for \${ctx.expected}\` }
})
`

// only a missing key's message is configured, so a size build's checkers
// check each value as they would without it
const missing: Record<string, string> = {
	"sets a missing key's message apart from its path": `
		show(type({ k: "string" }), {}, { k: 1 })
		show(type({ k: { a: "string >= 3" } }), {}, { k: {} })
	`,
	"lists a union's errors where each is a missing key saying it": `
		show(type({ a: "string" }).or({ b: "string" }), {}, { a: 1 })
		show(type({ k: type({ a: "string" }).or({ b: "string" }) }), { k: {} }, {})
	`,
	"says a missing key's value's message for a union's errors, which is its Type's": `
		const Same = type("string").configure({ message: "Required" })
		show(type({ a: Same }).or({ b: Same }), {}, { a: 1, b: 1 })
		show(type({ a: Same }).or({ b: "string" }), {})
	`
}

const missingConfig = `import { configure } from "arktype/config"

configure({ required: { message: "Required" } })
`

// a value named by its label (.label()) in each message written by default
const labeled: Record<string, string> = {
	"names a value by its label, after the path before the key it names": `
		const Price = type("number > 0").label("Unit price")
		const LineItem = type({ unitPriceCents: Price })
		show(LineItem, { unitPriceCents: 0 }, { unitPriceCents: "1" }, {})
		show(Price, 0)
		show(type({ billing: LineItem, items: LineItem.array(), prices: type("number > 0").label("Price").array() }), { billing: { unitPriceCents: 0 }, items: [{ unitPriceCents: 0 }], prices: [0] })
		standard(LineItem, { unitPriceCents: 0 })
	`,
	"says a message configured for it as written": `
		show(type({ k: type("number > 0").label("K").message("Enter a K") }), { k: 0 }, {})
		show(type({ k: type("number").moreThan(0, "Enter a K").label("K") }), { k: 0 }, { k: "1" })
	`,
	"names a union's value by its label, and lists each branch's by its own": `
		show(type({ k: type("string | number").label("K") }), { k: true })
		show(type({ k: type("string > 3 | string.email").label("K") }), { k: "ab" })
		show(type({ k: type("string").label("K").or(type("number").label("K")) }), { k: true })
		show(type({ k: type("string").describe("an id").label("K") }), { k: 1 })
		show(type({ a: type("string").label("A") }).or({ b: "number" }), { a: 1, b: "x" })
		show(type({ k: type({ a: type("string").label("A") }).or({ b: "number" }) }), { k: {} })
	`,
	"keeps a label through a pipe and the validator a morph calls": `
		const LineItem = type({ unitPriceCents: type("number > 0").label("Unit price") })
		show(LineItem.pipe(o => o), { unitPriceCents: 0 })
		show(type({ p: type("string").pipe(s => LineItem(JSON.parse(s))) }), { p: '{"unitPriceCents":0}' })
		show(type({ p: type("string.json.parse").to(LineItem) }), { p: '{"unitPriceCents":0}' })
	`,
	"names a value by its label in what a narrow raises it must be": `
		const pct = (s: string) => +s >= 0 && +s <= 100
		show(type({ k: type("string").narrow((s, ctx) => pct(s) || ctx.mustBe("between 0 and 100")).label("Pct") }), { k: "200" })
		show(type({ k: type("string").narrow((s, ctx) => pct(s) || ctx.reject({ expected: "between 0 and 100", actual: "200" })).label("Pct") }), { k: "200" })
		show(type({ k: type("string").narrow((s, ctx) => pct(s) || ctx.reject({ message: "Pct is out of range" })).label("Pct") }), { k: "200" })
		show(type({ k: type({ a: "string" }).narrow((o, ctx) => pct(o.a) || ctx.reject({ expected: "between 0 and 100", relativePath: ["a"] })).label("Pct") }), { k: { a: "200" } })
	`,
	"leaves what a Type a labeled narrow calls with its ctx raises as that Type names it": `
		const Limits = type({ max: type("number").narrow((n, ctx) => n > 0 || ctx.mustBe("positive")) })
		show(type("object").narrow((o, ctx) => !(Limits(o, ctx) instanceof type.errors)).label("Config"), { max: 0 }, 0)
		show(type({ k: type("object").narrow((o, ctx) => !(Limits(o, ctx) instanceof type.errors) && ctx.mustBe("sorted")).label("Config") }), { k: { max: 1 } })
		const Throwing = type("object").narrow((): boolean => { throw new Error("unreachable host") }).label("Host")
		show(type({ host: type("object").pipe.try(function resolve(o, ctx) { return Throwing(o, ctx) }), port: type("number").narrow((n, ctx) => n > 0 || ctx.mustBe("positive")) }), { host: {}, port: 0 })
		show(type("object").pipe.try(function resolve(o, ctx) { return Throwing(o, ctx) }).label("Server"), {})
	`,
	"names a value by its label in what a morph raises it must be": `
		show(type({ k: type("string").pipe((s, ctx) => ctx.error("a product")).label("K") }), { k: "x" }, { k: 1 })
		show(type({ k: type("string").pipe((s, ctx) => ctx.error({ message: "No such product" })).label("K") }), { k: "x" })
		show(type({ k: type("string").pipe.try(function toId(): number { throw new Error("no such id") }).label("K") }), { k: "x" })
		show(type({ k: type("string.date.parse").label("K") }), { k: "!!" })
		show(type("string.url.parse").label("K"), "!!")
		show(type({ k: type("string.json.parse").label("K") }), { k: "{" })
		show(type({ ks: type("string.date.parse").label("K").array() }), { ks: ["!!", "2020-01-01"] })
		show(type({ k: type("string.json.parse").label("K").or("number") }), { k: "{" }, { k: true })
		const Limits = type({ max: type("number").narrow((n, ctx) => n > 0 || ctx.mustBe("positive")) })
		show(type("string").pipe((s, ctx) => Limits(JSON.parse(s), ctx)).label("Config"), '{"max":0}')
		standard(type({ k: type("string.date.parse").label("K") }), { k: "!!" })
	`
}

// a label no site names a value by, as its Type checks nothing itself
const labeledRaised: Record<string, string> = {
	"names a value only a morph checks by its label": `
		show(type("unknown").pipe((v, ctx) => ctx.error("a product")).label("Product"), "x")
	`
}

// a label where a function configured for its code writes what it expects
const labeledWritten: Record<string, string> = {
	"names a value by its label beside text a function writes": `
		show(type({ k: type("number > 0").label("K") }), { k: 0 })
		show(type({ k: type("number > 0").label("K").message("Enter a K") }), { k: 0 })
	`
}

const writtenConfig = `import { configure } from "arktype/config"

configure({ min: { expected: ctx => \`over \${ctx.rule}\` } })
`

const appOf = (
	rows: Record<string, string>,
	imports = ""
) => `${imports}import { type } from "arktype"

const standard = (t: any, input: unknown) =>
	console.log(index, JSON.stringify(t["~standard"].validate(input).issues.map((issue: any) => [issue.message, issue.path])))
const show = (t: any, ...inputs: unknown[]) => {
	for (const input of inputs) {
		const out = t(input)
		console.log(index, JSON.stringify([input, out instanceof type.errors ? [out.summary, out.issues.map((issue: any) => [issue.code, issue.path.map(String), issue.expected, issue.message])] : "ok"]))
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
	opts: PrecompileUnpluginOptions = {},
	conditions = production
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

const rowsOf = (out: string, index: number) =>
	out.split("\n").filter(line => line.startsWith(`${index} `))

const strategies: Record<string, PrecompileUnpluginOptions> = {
	production: {},
	smallest: { preset: "smallest" },
	size: { optimize: "size" },
	"module alone": { prune: false }
}

// each build's code by its strategy, once built
type Bundles = Record<string, string>

const itWritesAsArktype = (
	name: string,
	rows: Record<string, string>,
	files: Record<string, string>,
	opts: PrecompileUnpluginOptions = {},
	also?: (bundles: Bundles) => void
) =>
	describe(name, () => {
		const root = writeFixture(
			files,
			tempPath("messageText", name.replace(/ /g, "-"))
		)
		const bundles: Bundles = {}
		let plain: string

		before(async () => {
			plain = runPlain(root)
			for (const strategy in strategies) {
				bundles[strategy] = await bundle(root, {
					...opts,
					...strategies[strategy]
				})
			}
		})

		for (const [index, behavior] of Object.keys(rows).entries()) {
			it(behavior, () => {
				const expected = rowsOf(plain, index)
				attest(expected.length > 0).equals(true)
				for (const strategy in bundles) {
					attest([strategy, ...rowsOf(run(bundles[strategy]), index)]).equals([
						strategy,
						...expected
					])
				}
			})
		}

		also?.(bundles)
	})

contextualize(function (this: Mocha.Suite) {
	this.timeout(600_000)

	it("writes an error's summaryIn() as its summary, and refuses a locale as arktype does without arktype/i18n", async () => {
		const root = writeFixture(
			{
				"package.json": `{"type":"module"}`,
				"main.ts": `import { type } from "arktype"
const out = type({ a: "string" })({ a: 1 })
if (!(out instanceof type.errors)) throw new Error("expected errors")
const refusal = (locale: unknown) => {
	try {
		out.summaryIn(locale as never)
		return "returned"
	} catch (e) {
		return (e as Error).message
	}
}
console.log(JSON.stringify({
	summary: out.summary,
	summaryIn: out.summaryIn(),
	summaryInUndefined: out.summaryIn(undefined),
	notALocale: refusal("de"),
	aLocale: refusal({})
}))
`
			},
			tempPath("messageText", "summaryIn")
		)
		// the runtime as published, so each of its error classes is the one built
		for (const opts of [
			{ optimizeErrors: "speed" },
			{ optimize: "size", optimizeErrors: "size" }
		] as const) {
			attest(JSON.parse(run(await bundle(root, opts, [])))).snap({
				summary: "a must be a string",
				summaryIn: "a must be a string",
				summaryInUndefined: "a must be a string",
				notALocale: "Expected a Locale object",
				aLocale:
					'import "arktype/i18n" to write errors in locales other than en'
			})
		}
	})

	itWritesAsArktype("a message told by its text", told, {
		"main.ts": appOf(told)
	})

	itWritesAsArktype(
		"a message configured for a code",
		coded,
		{
			"config.ts": config,
			"main.ts": appOf(coded, 'import "./config.ts"\n')
		},
		{ config: "config.ts" },
		bundles => {
			it("is noted on its issue by its site", () => {
				for (const strategy in bundles) {
					attest([
						strategy,
						bundles[strategy].includes(
							'codeSiteOf("domain", "a string", "Wrong type")'
						)
					]).equals([strategy, true])
				}
			})
		}
	)

	itWritesAsArktype(
		"a label",
		labeled,
		{ "main.ts": appOf(labeled) },
		{},
		bundles => {
			it("is noted on its issue by its site", () => {
				attest(
					bundles.production.includes(
						'labelSiteOf("min", "positive", "Unit price must be positive", "Unit price")'
					)
				).equals(true)
			})
		}
	)

	itWritesAsArktype("a label only a morph's error is named by", labeledRaised, {
		"main.ts": appOf(labeledRaised)
	})

	itWritesAsArktype(
		"a label beside text a function writes",
		labeledWritten,
		{
			"config.ts": writtenConfig,
			"main.ts": appOf(labeledWritten, 'import "./config.ts"\n')
		},
		{ config: "config.ts" }
	)

	itWritesAsArktype(
		"a message configured for a missing key",
		missing,
		{
			"config.ts": missingConfig,
			"main.ts": appOf(missing, 'import "./config.ts"\n')
		},
		{ config: "config.ts" },
		bundles => {
			it("is noted on its issue by its site, or by what a checker's key is passed", () => {
				attest(
					bundles.production.includes(
						'codeSiteOf("required", "a string", "Required")'
					)
				).equals(true)
				attest(
					bundles.smallest.includes(
						'sayingMissing(stringCheck, "Required", codedIssue)'
					)
				).equals(true)
			})
		}
	)
})
