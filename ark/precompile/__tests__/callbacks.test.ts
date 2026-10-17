import { attest, contextualize } from "@ark/attest"
import type { PrecompileOptions } from "@ark/precompile"
import type { Type } from "arktype"
import { analyze, diagnosticsOf, statusesOf } from "./utils.ts"

const nonStatic = `{
	const result = "string"
	return result
}`

contextualize(() => {
	it("thunk definitions", () => {
		attest(
			statusesOf(`import { type, scope } from "arktype"
const A = type(() => type("string"))
const B = type({ a: () => type("number"), b: [() => type("boolean")] })
const $ = scope({ a: () => type("string"), b: "a[]" }).export()`)
		).snap([
			"2:11 accepted string",
			"3:11 accepted { a: number, b: [boolean] }",
			"4:11 accepted"
		])
	})

	it("map", () => {
		attest(
			statusesOf(`import { type } from "arktype"
const A = type({ a: "string" }).map(prop => [prop, { key: "b", value: prop.value }])`)
		).snap(["2:11 accepted { a: string, b: string }"])
	})

	it("configure, meta writers and selectors", () => {
		attest(
			statusesOf(`import { type } from "arktype"
const A = type("string").configure(meta => ({ description: \`\${meta.description}!\` }))
const B = type(["string", "@", meta => ({ ...meta, title: "s" })])
const C = type({ a: "string" }).configure({ description: "a" }, { where: n => n.kind === "domain" })`)
		).snap([
			"2:11 accepted string",
			"3:11 accepted string",
			"4:11 accepted { a: string }"
		])
	})

	it("distribute", () => {
		attest(
			statusesOf(`import { type } from "arktype"
const A = type("'a' | 'b'").distribute(branch => branch.expression, branches => branches.join())`)
		).snap(["2:11 accepted"])
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
  a function (/main.ts:2:16) is not a static helper: its body is not one expression or one \`return\``)
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

	it("description writers", () => {
		attest(
			statusesOf(`import { scope } from "arktype"
const A = scope({ a: "number" }, { domain: { description: () => "a custom number" } }).export()`)
		).snap(["2:11 accepted"])
	})

	it("code reading a hole's name is unsupported", () => {
		const source = `import { type, scope } from "arktype"
const isLong = (s: string) => s.length > 3
const A = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => n.kind === "predicate" && n.expression.startsWith("is") })
const B = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => n.kind === "predicate" })
const C = scope({}, { predicate: { description: node => node.expression.toUpperCase() } }).type("string").narrow(isLong)
const D = type("string").describe(type("string").narrow(isLong).description)
const E = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => n.toString().includes("is") })`
		attest(statusesOf(source)).snap([
			"3:11 rejected\n  `n.expression` (/main.ts:3:133) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder",
			"4:11 accepted { a: string }",
			"5:11 rejected\n  `node.expression` (/main.ts:5:57) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder",
			'6:11 rejected\n  `type("string").narrow(isLong).description` (/main.ts:6:35) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder',
			"7:11 rejected\n  `n.toString()` (/main.ts:7:107) prints the name of `isLong` (/main.ts:2:16), which the build knows only by a placeholder"
		])
		attest(diagnosticsOf(source)[0])
			.snap(`/main.ts:3:11  type({ a: type("string").narrow(isLong) }).configure({ desc… can't be precompiled yet
  \`n.expression\` (/main.ts:3:133) prints the name of \`isLong\` (/main.ts:2:16), which the build knows only by a placeholder
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
	})

	it("narrows on literal values", () => {
		attest(
			statusesOf(`import { type } from "arktype"
const A = type("'a' | 'b'").narrow(s => s === "a")
const B = type("'a' | 'b'").narrow(s => ${nonStatic})
const C = type("string").narrow(s => ${nonStatic})`)
		).snap([
			'2:11 accepted "a"',
			"3:11 rejected\n  arktype calls a function (/main.ts:3:36) while defining the type, so it must be a static helper\n  a function (/main.ts:3:36) is not a static helper: its body is not one expression or one `return`",
			"7:11 accepted string"
		])
	})

	it("json schema fallbacks", () => {
		attest(
			statusesOf(`import { type } from "arktype"
const A = type("string").pipe(s => s.length).toJsonSchema({ fallback: ctx => ctx.base })`)
		).snap(["2:11 accepted"])
	})

	it("validation-time callbacks are holes", () => {
		const result = analyze(`import { type } from "arktype"
const format = (s: string) => {
	const trimmed = s.trim()
	return trimmed
}
const A = type("string").pipe(format).narrow((s, ctx) => s.length > 0 || ctx.reject("non-empty"))`)
		attest(
			result.sites[0].holes.map(
				hole => `${hole.kind} ${hole.start}:${hole.end}`
			)
		).snap(["function 137:143", "function 152:203"])
	})

	it("holes are named by placeholders at build", () => {
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
		attest(descriptionsOf()).snap([
			"a number and valid according to isPositive$hole_j0i6oq1s1b6p1",
			"an instance of User$hole_hkuzc012jnsq9"
		])
		attest(descriptionsOf({ runtime: "arktype" })).snap([
			"a number and valid according to an anonymous predicate",
			"an instance of "
		])
	})

	it("names a function a refusal prints by its source", () => {
		attest(
			diagnosticsOf(`import { type } from "arktype"
const isEven = (n: number) => n % 2 === 0
export const schema = type("number").narrow(isEven).toJsonSchema()`)
		).snap([
			'/main.ts:3:23  type("number").narrow(isEven).toJsonSchema() cannot be precompiled\n  `type("number").narrow(isEven).toJsonSchema()` throws ToJsonSchemaError: {\n    code: "predicate",\n    base: {\n        type: "number"\n    },\n    predicate: Function(isEven)\n} at build\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
		])
	})

	it("defaults", () => {
		const source = `import { type } from "arktype"
const A = type({ a: ["string[]", "=", () => ${nonStatic}] })
const B = type({ a: [["string", "=>", s => ${nonStatic}], "=", "a"] })
const C = type({ a: [["string", ":", s => ${nonStatic}], "=", "a"] })
const D = type({ a: [["string", ":", s => s.length > 0], "=", "a"] })`
		attest(statusesOf(source)).snap([
			"2:11 accepted { a: string[] = Function(fn$hole_1vu6ogz1nemc20) }",
			'6:11 accepted { a: (In: string) => Out<unknown> = "a" }',
			'10:11 accepted { a: string = "a" }',
			'14:11 accepted { a: string = "a" }'
		])
		attest(
			analyze(source).sites.map(site =>
				site.holes.map(hole => `${hole.kind} ${hole.isCalledAtDefinition}`)
			)
		).snap([
			["function false"],
			["function false"],
			["function false"],
			["function false"]
		])
	})
})
