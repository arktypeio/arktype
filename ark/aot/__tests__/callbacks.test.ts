import { attest, contextualize } from "@ark/attest"
import { renderDiagnostic, type PrecompileOptions } from "@ark/aot"
import type { Type } from "arktype"
import {
	analyze,
	diagnosticsOf,
	normalized,
	precompile,
	statusesOf
} from "./utils.ts"

const nonStatic = `{
	let result = "string"
	return result
}`

contextualize(() => {
	it("callbacks arktype calls at definition", () => {
		attest(
			statusesOf(`import { type, scope } from "arktype"
const A = type(() => type("string"))
const B = type({ a: () => type("number"), b: [() => type("boolean")] })
const C = scope({ a: () => type("string"), b: "a[]" }).export()
const D = type({ a: "string" }).map(prop => [prop, { key: "b", value: prop.value }])
const E = type("string").configure(meta => ({ description: \`\${meta.description}!\` }))
const F = type(["string", "@", meta => ({ ...meta, title: "s" })])
const G = type({ a: "string" }).configure({ description: "a" }, { where: n => n.kind === "domain" })
const H = type("'a' | 'b'").distribute(branch => branch.expression, branches => branches.join())
const I = scope({ a: "number" }, { domain: { description: () => "a custom number" } }).export()
const J = type("string").pipe(s => s.length).toJsonSchema({ fallback: ctx => ctx.base })`)
		).snap([
			"2:11 accepted string",
			"3:11 accepted { a: number, b: [boolean] }",
			"4:11 accepted",
			"5:11 accepted { a: string, b: string }",
			"6:11 accepted string",
			"7:11 accepted string",
			"8:11 accepted { a: string }",
			"9:11 accepted",
			"10:11 accepted",
			"11:11 accepted"
		])
	})

	it("callbacks arktype calls are static helpers", () => {
		const source = `import { type, scope } from "arktype"
const A = type(() => ${nonStatic})
const B = type({ a: "string" }).map(prop => ${nonStatic})
const C = type("string").configure(meta => ${nonStatic})
const D = type("'a' | 'b'").distribute(branch => ${nonStatic})
const E = scope({ a: "number" }, { domain: { description: () => ${nonStatic} } }).export()
const F = type("string").pipe(s => s.length).toJsonSchema({ fallback: ctx => ${nonStatic} })`
		attest(statusesOf(source)[0]).snap(`2:11 rejected
  arktype calls a function (/main.ts:2:16) while defining the type, so it must be a static helper
  a function (/main.ts:2:16) is not a static helper: it runs \`let result = "string"\` (/main.ts:3:2), where a static helper holds only consts, \`if\`s that return and a final \`return\``)
		attest(
			analyze(source).sites.map(site => `${site.line} ${site.status}`)
		).snap([
			"2 rejected",
			"6 rejected",
			"10 rejected",
			"14 rejected",
			"18 rejected",
			"22 rejected"
		])
	})

	it("a static helper may check what its Type infers", () => {
		const source = `import { type } from "arktype"
type Range = { min: number }
const checked = (min: number) => {
	const t = type({ min: \`number >= \${min}\` })
	t.infer satisfies Range
	return t
}
const read = (min: number) => {
	const t = type({ min: \`number >= \${min}\` })
	t.expression satisfies string
	return t
}
const A = checked(1)
const B = read(1)`
		attest(statusesOf(source)).snap([
			"9:12 rejected\n  `min` is a parameter of read (/main.ts:8:15); its value is known only at runtime",
			"13:11 accepted { min: number >= 1 }"
		])
	})

	it("hkt bodies", () => {
		attest(
			statusesOf(`import { type, generic, Hkt } from "arktype"
const Box = generic("t")(
	args => type({ box: args.t }),
	class extends Hkt {
		declare body: { box: this[0] }
	}
)
const A = Box("string")
const Stateful = generic("t")(
	args => type({ box: args.t }),
	class extends Hkt {
		count = 0
	}
)
const B = Stateful("string")`)
		).snap([
			"2:13 accepted",
			"8:11 accepted { box: string }",
			"9:18 rejected\n  arktype calls a class (/main.ts:11:2) while defining the type, so it must be a static helper\n  `count = 0` runs when the class is constructed",
			"10:10 accepted { box: (In: unknown) => Out<unknown> }"
		])
	})

	it("a class as a Standard Schema", () => {
		attest(
			statusesOf(`import { type } from "arktype"
class Schema {
	static "~standard" = { version: 1, vendor: "x", validate: (value: unknown) => ({ value }) }
}
const A = type({ a: Schema })
const B = type({ a: class {} })`)
		).snap([
			'5:11 rejected\n  arktype reads `class Schema { static "~standard" = { version: 1, vendor: "…` while defining the type, so it must be static',
			"6:11 rejected\n  arktype calls the class (/main.ts:6:21) as a function, which throws a TypeError"
		])
	})

	it("reading a hole's name", () => {
		const source = `import { type, scope } from "arktype"
const isLong = (s: string) => s.length > 3
const A = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => n.kind === "predicate" && n.expression.startsWith("is") })
const B = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => n.kind === "predicate" })
const C = scope({}, { predicate: { description: node => node.expression.toUpperCase() } }).type("string").narrow(isLong)
const D = type("string").describe(type("string").narrow(isLong).description)
const E = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => n.toString().includes("is") })`
		attest(statusesOf(source)).snap([
			"3:11 rejected\n  `n.expression` (/main.ts:3:133) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder",
			"4:11 accepted { a: string & isLong$hole_ms785y1cqugwq }",
			"5:11 rejected\n  `node.expression` (/main.ts:5:57) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder",
			'6:11 rejected\n  `type("string").narrow(isLong).description` (/main.ts:6:35) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder',
			"7:11 rejected\n  `n.toString()` (/main.ts:7:107) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder"
		])
		attest(diagnosticsOf(source)[0])
			.snap(`/main.ts:3:11  type({ a: type("string").narrow(isLong) }).configure({ desc… can't be precompiled yet
  \`n.expression\` (/main.ts:3:133) prints the name of \`isLong\` (/main.ts:2:16), which the build knows only by a placeholder
  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.`)
	})

	it("a narrow a union's unit calls and its other branches keep", () => {
		const source = `import { type, type Traversal } from "arktype"
const isSet = (data: unknown, ctx: Traversal) => {
	if (data === undefined || data === null) {
		return ctx.reject({ message: "required" })
	}
	return true
}
const A = type("string | undefined").narrow(isSet)
const B = type({ a: type("string > 0").or(type.undefined).narrow(isSet) })
const C = type("string | undefined").narrow(s => ${nonStatic})`
		// arktype calls it to decide \`undefined\`, which the build does in its
		// place, and the validator receives it to check each string
		attest(statusesOf(source)).snap([
			"8:11 accepted string & isSet$hole_bq3vr207pu92u",
			"9:11 accepted { a: string >= 1 & isSet$hole_bq3vr207pu92u }",
			'10:11 rejected\n  arktype calls a function (/main.ts:10:45) while defining the type, so it must be a static helper\n  a function (/main.ts:10:45) is not a static helper: it runs `let result = "string"` (/main.ts:11:2), where a static helper holds only consts, `if`s that return and a final `return`'
		])
		attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
			'/main.ts:10:11  type("string | undefined").narrow(s => { let result = "stri… cannot be precompiled'
		])
	})

	it("narrows on literal values", () => {
		attest(
			statusesOf(`import { type } from "arktype"
const A = type("'a' | 'b'").narrow(s => s === "a")
const B = type("'a' | 'b'").narrow(s => ${nonStatic})
const C = type("string").narrow(s => ${nonStatic})
const D = type("'a' | 0").narrow((d, ctx) => typeof d !== "number" || d > 0 || ctx.mustBe("positive"))
import { isPositive } from "pkg"
const E = type("'a' | 0").narrow(d => typeof d !== "number" || isPositive(d))`)
		).snap([
			'2:11 accepted "a"',
			'3:11 rejected\n  arktype calls a function (/main.ts:3:36) while defining the type, so it must be a static helper\n  a function (/main.ts:3:36) is not a static helper: it runs `let result = "string"` (/main.ts:4:2), where a static helper holds only consts, `if`s that return and a final `return`',
			"7:11 accepted string & fn$hole_bvgui20gqfe3l",
			// arktype decides each unit by calling the narrow, so the build must too
			'11:11 accepted "a"',
			"13:11 rejected\n  arktype calls a function (/main.ts:13:34) while defining the type, so it must be a static helper\n  `pkg` is a package the build does not read"
		])
	})

	it("placeholder hole names", () => {
		const descriptionsOf = (opts?: PrecompileOptions) =>
			analyze(
				`import { type } from "arktype"
const isPositive = (n: number) => n > 0
class User {}
const A = type("number").narrow(isPositive)
const B = type.instanceOf(User)`,
				{},
				opts
			).sites.map(site => (site.value as Type).description)
		attest(normalized(descriptionsOf())).snap([
			"a number and valid according to isPositive$hole_#0",
			"an instance of User$hole_#1"
		])
		attest(descriptionsOf({ runtime: "arktype" })).snap([
			"a number and valid according to an anonymous predicate",
			"an instance of "
		])
	})

	it("refusals print functions by source", () => {
		attest(
			diagnosticsOf(`import { type } from "arktype"
const isEven = (n: number) => n % 2 === 0
export const schema = type("number").narrow(isEven).toJsonSchema()`)
		).snap([
			'/main.ts:3:23  type("number").narrow(isEven).toJsonSchema() cannot be precompiled\n  `type("number").narrow(isEven).toJsonSchema()` throws ToJsonSchemaError: Can\'t convert "predicate" to JSON Schema. Configure fallback.predicate to write it:\n{\n    code: "predicate",\n    base: {\n        type: "number"\n    },\n    predicate: Function(isEven)\n} at build\n  Standalone builds construct every Type at build time. Make it static, or put // @ark-runtime on the line before it, so arktype defines it at runtime.'
		])
	})

	it("defaults", () => {
		const source = `import { type } from "arktype"
const A = type({ a: ["string[]", "=", () => ${nonStatic}] })
const B = type({ a: [["string", "=>", s => ${nonStatic}], "=", "a"] })
const C = type({ a: [["string", ":", s => ${nonStatic}], "=", "a"] })
const D = type({ a: [["string", ":", s => s.length > 0], "=", "a"] })`
		attest(normalized(statusesOf(source))).snap([
			"2:11 accepted { a: string[] = Function(fn$hole_#0) }",
			'6:11 accepted { a: (In: string) => Out<unknown> = "a" }',
			'10:11 accepted { a: string & fn$hole_#1 = "a" }',
			'14:11 accepted { a: string & fn$hole_#2 = "a" }'
		])
	})

	describe("keys a callback passes ctx.reject() or ctx.error()", () => {
		const emittedDiagnosticsOf = (source: string, opts?: PrecompileOptions) =>
			precompile(source, {}, opts).diagnostics.map(renderDiagnostic)

		const dropping = `import { type, type Traversal } from "arktype"
const FLAG = "dispute"
const isUnique = (ids: string[], ctx: Traversal) =>
	new Set(ids).size === ids.length ||
	ctx.reject({ flags: FLAG, message: "Transaction IDs must be unique" })
export const Ids = type("string[]").narrow(isUnique)`

		it("refuses a key a standalone validator's error leaves out", () => {
			attest(emittedDiagnosticsOf(dropping)).snap([
				'/main.ts:6:20  type("string[]").narrow(isUnique) can\'t be precompiled yet\n  the `flags` key `isUnique` passes to ctx.reject() can\'t be precompiled to a standalone validator\n  A standalone validator\'s error keeps only the code, path, data, expected and message a narrow or morph raises. Read what the program needs from those, or put // @ark-runtime on the line before this definition, or build with runtime: "arktype", so its errors keep every key.'
			])
		})

		it("names each key and method a callback drops", () => {
			attest(
				emittedDiagnosticsOf(`import { type } from "arktype"
const base = { meta: { field: "name" } }
export const Name = type("string").pipe((s, ctx) =>
	s.length ? s
	: s === " " ? ctx.reject({ ...{ code: "pattern", flags: "i" }, rule: "x" })
	: ctx.error({ ...base, ["meta"]: {}, message: "Required" })
)`)
			).snap([
				'/main.ts:3:21  type("string").pipe((s, ctx) => s.length ? s : s === " " ? … can\'t be precompiled yet\n  the `flags`, `rule` and `meta` keys `(s, ctx) => s.length ? s : s === " " ? ctx.reject({ ...{ co…` passes to ctx.reject() and ctx.error() can\'t be precompiled to a standalone validator\n  A standalone validator\'s error keeps only the code, path, data, expected and message a narrow or morph raises. Read what the program needs from those, or put // @ark-runtime on the line before this definition, or build with runtime: "arktype", so its errors keep every key.'
			])
		})

		it("reads each object a condition picks", () => {
			attest(
				emittedDiagnosticsOf(`import { type } from "arktype"
export const Even = type("number").narrow((n, ctx) =>
	n % 2 === 0 || ctx.reject(n > 0 ? { message: "odd" } : { message: "negative", severity: 1 })
)`).map(d => d.split("\n")[1])
			).snap([
				"  the `severity` key `(n, ctx) => n % 2 === 0 || ctx.reject(n > 0 ? { message: \"o…` passes to ctx.reject() can't be precompiled to a standalone validator"
			])
		})

		it("accepts the keys a standalone validator's error is written from", () => {
			attest(
				emittedDiagnosticsOf(`import { type } from "arktype"
export const A = type("string").narrow((s, ctx) => s.length > 0 || ctx.reject({ message: "Required" }))
export const B = type("string").narrow((s, ctx) => s.length > 0 || ctx.reject({ expected: "non-empty" }))
export const C = type({ a: "string" }).narrow((o, ctx) => o.a !== "" || ctx.reject({ path: ["a"], message: "Required" }))
export const D = type({ a: "string" }).narrow((o, ctx) => o.a !== "" || ctx.reject({ relativePath: ["a"], expected: "non-empty" }))
export const E = type("string").narrow((s, ctx) => s.length > 0 || ctx.reject({ code: "predicate", message: "Required" }))
export const F = type("string").narrow((s, ctx) => s.length > 0 || ctx.reject({ expected: "non-empty", actual: "empty", description: "text" }))
export const G = type("string").narrow((s, ctx) => s.length > 0 || ctx.mustBe("non-empty"))
export const H = type("string").pipe((s, ctx) => (s.length ? s : ctx.error({ prefixPath: ["s"], data: s, message: "Required" })))
export const I = type("string").pipe((s, ctx) => (s.length ? s : ctx.error("non-empty")))`)
			).equals([])
		})

		it("leaves what it can't read to the program", () => {
			attest(
				emittedDiagnosticsOf(`import { type } from "arktype"
const keyed = "flags"
const input = (message: string) => ({ flags: 1, message })
export const A = type("string").narrow((s, ctx) => s.length > 0 || ctx.reject(input("Required")))
export const B = type("string").narrow((s, ctx) => s.length > 0 || ctx.reject({ ...input("Required") }))
export const C = type("string").narrow((s, ctx) => s.length > 0 || ctx.reject({ [keyed]: 1, message: "Required" }))
// a ctx of its own, which isn't arktype's
export const D = type("string[]").narrow((ids, ctx) => ids.every(id => [id].some((_, ctx) => ctx.reject({ flags: 1 }))))`)
			).equals([])
		})

		it("leaves a runtime island or arktype's runtime its keys", () => {
			attest(
				emittedDiagnosticsOf(
					dropping.replace(
						"export const Ids",
						"// @ark-runtime\nexport const Ids"
					)
				)
			).equals([])
			attest(emittedDiagnosticsOf(dropping, { runtime: "arktype" })).equals([])
		})
	})
})
