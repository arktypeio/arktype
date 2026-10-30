import { attest, contextualize } from "@ark/attest"
import type { PrecompileOptions } from "@ark/aot"
import type { Type } from "arktype"
import { analyze, diagnosticsOf, normalized, statusesOf } from "./utils.ts"

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
  a function (/main.ts:2:16) is not a static helper: it runs \`let result = "string"\` (/main.ts:3:2), where a static helper declares only consts before one \`return\``)
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
			"4:11 accepted { a: string & isLong$hole_yx1e5j0rpopfy }",
			"5:11 rejected\n  `node.expression` (/main.ts:5:57) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder",
			'6:11 rejected\n  `type("string").narrow(isLong).description` (/main.ts:6:35) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder',
			"7:11 rejected\n  `n.toString()` (/main.ts:7:107) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder"
		])
		attest(diagnosticsOf(source)[0])
			.snap(`/main.ts:3:11  type({ a: type("string").narrow(isLong) }).configure({ desc… can't be precompiled yet
  \`n.expression\` (/main.ts:3:133) prints the name of \`isLong\` (/main.ts:2:16), which the build knows only by a placeholder
  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.`)
	})

	it("narrows on literal values", () => {
		attest(
			statusesOf(`import { type } from "arktype"
const A = type("'a' | 'b'").narrow(s => s === "a")
const B = type("'a' | 'b'").narrow(s => ${nonStatic})
const C = type("string").narrow(s => ${nonStatic})`)
		).snap([
			'2:11 accepted "a"',
			'3:11 rejected\n  arktype calls a function (/main.ts:3:36) while defining the type, so it must be a static helper\n  a function (/main.ts:3:36) is not a static helper: it runs `let result = "string"` (/main.ts:4:2), where a static helper declares only consts before one `return`',
			"7:11 accepted string & fn$hole_13vjtm1qdc194"
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
})
