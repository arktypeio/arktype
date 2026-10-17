import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	createNodeHost,
	precompileModule,
	Precompiler,
	renderDiagnostic
} from "@ark/precompile"
import { scope, type } from "arktype"
import { readFileSync } from "node:fs"
import { inFreshProcess, memoryHost, normalized, precompile } from "./utils.ts"

// each module's code and modules, built in the order given
const builtInOrder = (files: Record<string, string>, order: string[]) =>
	inFreshProcess(
		async (files: Record<string, string>, order: string[]) => {
			const { memoryHost } = await import("./utils.ts")
			const { Precompiler } = await import("@ark/precompile")
			const precompiler = new Precompiler(memoryHost(files))
			const results: Record<string, unknown> = {}
			for (const id of order) {
				const { code, modules } = precompiler.precompile(files[id], id)
				results[id] = [code, modules]
			}
			return results
		},
		[files, order]
	)

contextualize(() => {
	describe("standalone", () => {
		it("folds sites to validators", () => {
			const result = precompile(`import { type, ArkErrors } from "arktype"
const max = 64
export const User = type({ name: \`string <= \${max}\` })
export const Same = type({ name: "string <= 64" })
export const Users = User.array()
export const isError = (data: unknown) => data instanceof ArkErrors`)
			attest(normalized(result.code)).snap(`import { ArkErrors } from "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#4"
const max = 64
$arkfixConfig()
export const User = /* @__PURE__ */ $ark#0()
export const Same = /* @__PURE__ */ $ark#2()
export const Users = /* @__PURE__ */ $ark#3()
export const isError = (data: unknown) => data instanceof ArkErrors`)
			attest(normalized(Object.keys(result.modules))).snap([
				"~arktype/#0",
				"~arktype/#1",
				"~arktype/#2",
				"~arktype/#3",
				"~arktype/#4"
			])
			attest(result.map?.sources).equals(["/main.ts"])
		})

		it("folds introspection", () => {
			const result = precompile(
				`import { type } from "arktype"
import { User } from "./user.ts"
const Point = type({ x: "number" })
export const json = Point.json
export const schema = Point.toJsonSchema()
export const userJson = User.toJSON()`,
				{
					"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
				}
			)
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { #4 as $ark#4 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#5"
import { User } from "./user.ts"
import "./user.ts"
$arkfixConfig()
const Point = /* @__PURE__ */ $ark#0()
export const json = /* @__PURE__ */ $ark#2()
export const schema = /* @__PURE__ */ $ark#3()
export const userJson = /* @__PURE__ */ $ark#4()`)
			attest(
				normalized(
					Object.entries(result.modules).flatMap(([specifier, module]) =>
						specifier.includes("json") ? [module] : []
					)
				)
			).snap([
				'import * as runtime from "arktype/runtime"\n\nconst #0 = /* @__PURE__ */ (() => runtime.deepFreeze({ "required": [{ "key": "x", "value": "number" }], "domain": "object" }))()\n\nexport { #0 }\n',
				'import * as runtime from "arktype/runtime"\n\nconst #1 = /* @__PURE__ */ (() => runtime.deepFreeze({ "required": [{ "key": "name", "value": "string" }], "domain": "object" }))()\n\nexport { #1 }\n'
			])
		})

		it("members of a folded JSON Schema", () => {
			const result = precompile(`import { type } from "arktype"
const A = type({ a: "string" })
export const properties = A.toJsonSchema().properties
export const required = A.toJsonSchema()["required"]`)
			attest(result.diagnostics).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#4"
$arkfixConfig()
const A = /* @__PURE__ */ $ark#0()
export const properties = $ark#2().properties
export const required = $ark#3()["required"]`)
		})

		it("refuses a JSON Schema calling a thunk", () => {
			const result = precompile(`import { type } from "arktype"
const T = type({ a: ["number[]", "=", () => []] })
export const schema = T.toJsonSchema()`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:3:23  T.toJsonSchema() can't be precompiled yet\n  a JSON Schema calling a default's thunk can't be precompiled to a standalone validator\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
		})

		it("a site refused as it's written holds no value", () => {
			const refused = precompile(`import { type } from "arktype"
const T = type({ a: ["number[]", "=", () => []] })
export const schema = T.toJsonSchema()`).sites[1]
			attest([refused.status, refused.value]).equals(["rejected", undefined])
		})

		it("introspection over a received default", () => {
			const result = precompile(
				`import { type } from "arktype"
import { Positive } from "./positive.ts"
export const schema = type({ a: [Positive, "=", 5] }).toJsonSchema({
	fallback: { predicate: ctx => ctx.base }
})`,
				{
					"/positive.ts": `import { type } from "arktype"
export const Positive = type("number").narrow(n => n > 0)`
				}
			)
			attest(result.diagnostics).equals([])
		})

		it("folds an unwritable JSON Schema to its throw", () => {
			const result = precompile(`import { type } from "arktype"
const Length = type("string").pipe(s => s.length)
export const schema = Length.toJsonSchema()`)
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#3"
$arkfixConfig()
const Length = /* @__PURE__ */ $ark#0(s => s.length)
export const schema = $ark#2()`)
		})

		it("folds introspection receiving cross-module functions", () => {
			const result = precompile(
				`import { type } from "arktype"
import { double } from "./containers.ts"
import { Doubled } from "./doubled.ts"
const Length = type("string").pipe(s => s.length)
const atMost = (n: number) => n <= 10
export const schemas = [
	Length.toJsonSchema(),
	Doubled.toJsonSchema(),
	type(["'a'", "=>", double]).toJsonSchema(),
	type({ a: [["number", ":", atMost], "=", 5] }).omit("a").json
]`,
				{
					"/containers.ts": `export const double = (n: number) => n * 2`,
					"/doubled.ts": `import { type } from "arktype"
import { double } from "./containers.ts"
export const Doubled = type("number").pipe(double)`
				}
			)
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { #4 as $ark#4 } from "~arktype/#1"
import { #5 as $ark#5 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#6"
import { double } from "./containers.ts"
import { Doubled } from "./doubled.ts"
$arkfixConfig()
const Length = /* @__PURE__ */ $ark#0(s => s.length)
const atMost = (n: number) => n <= 10
export const schemas = [
	$ark#2(),
	$ark#3(Doubled),
	$ark#4(double),
	$ark#5(atMost)
]`)
		})

		it("loads arktype where it was imported", () => {
			attest(
				normalized(
					precompile(`import "./polyfill.ts"
import { type, scope as $ } from "arktype"
import * as config from "./config.ts"
export const A = type("string")`).code
				)
			).snap(`import "./polyfill.ts"
import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#2"
import * as config from "./config.ts"
$arkfixConfig()
export const A = /* @__PURE__ */ $ark#0()`)
		})

		it("builds shared units at evaluation", () => {
			const { modules } = precompile(`import { type } from "arktype"
export const A = type("string")`)
			const [, unit] = Object.entries(modules).find(([specifier]) =>
				specifier.startsWith("~arktype/domain")
			)!
			attest(normalized(unit.match(/^const \w+ = .*/m)![0])).snap(
				"const #0 = /* @__PURE__ */ (() => {"
			)
		})

		it("hoists sites an early import reaches", () => {
			const files = {
				"/early.ts": `import { make } from "./main.ts"\nexport const made = make()`
			}
			const early = precompile(
				`import { made } from "./early.ts"
import { type } from "arktype"
export const make = () => type("string")`,
				files
			)
			attest(normalized(Object.keys(early.modules))).snap([
				"~arktype/#0",
				"~arktype/hoisted/#1"
			])
			const [, unit] = Object.entries(early.modules).find(([specifier]) =>
				specifier.startsWith("~arktype/hoisted/")
			)!
			attest(normalized(unit.match(/^function \w+\(\) {\n.*/m)![0]))
				.snap(`function #0() {
	return (#0Unit ??= (() => {`)
			// imported after arktype, the cycle reaches the module after its artifact
			const late = precompile(
				`import { type } from "arktype"
import { made } from "./early.ts"
export const make = () => type("string")`,
				files
			)
			attest(normalized(Object.keys(late.modules))).snap([
				"~arktype/#0",
				"~arktype/#1"
			])
		})

		it("minified statements", () => {
			const source = `import"./polyfill.ts";import{type}from"arktype";export const A=type("string");`
			attest(normalized(precompile(source).code))
				.snap(`import"./polyfill.ts";import "arktype";
import { #0 as $ark#0 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#2"
$arkfixConfig()
export const A=/* @__PURE__ */ $ark#0();`)
			attest(normalized(precompile(source, {}, { runtime: "arktype" }).code))
				.snap(`import"./polyfill.ts";import{type}from"arktype";
import "~arktype/units/#0"
export const A=type("string");`)
		})

		it("unsupported sites", () => {
			const result = precompile(
				`import { type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
export const A = type("string").pipe(trim)
export const B = type(\`string <= \${max}\`)
export const D = type("strin")
export const E = type({ "+": "delete", "[string]": "string", a: type("string.date.parse").or(type("number").pipe(trim)) })
export const F = type("number")
export const G = type("string").equals("string")
export const H = type("string").meta
export const I = type({ a: "string" }).props[0].key
export const J = type({ a: "string" }).in.extends("object")
export const K = type("string").extends(type("string").in)`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:6:18  type(\"strin\") throws a ParseError\n  'strin' is unresolvable\n  The precompiled site throws the same ParseError when it is created.",
				'/main.ts:7:18  type({ "+": "delete", "[string]": "string", a: type("string… can\'t be precompiled yet\n  structure { [string]: string, a: (In: string) => Out<Date> | (In: number) => Out<unknown>, + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:9:18  type("string").equals("string") can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type("string").equals`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:11:18  type({ a: "string" }).props[0].key can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type({ a: "string" }).props`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:12:18  type({ a: "string" }).in.extends("object") can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type({ a: "string" }).in.extends`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:13:18  type("string").extends(type("string").in) can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type("string").extends`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(normalized(result.code)).snap(`import { type } from "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { #4 as $ark#4 } from "~arktype/#1"
import $ark#5 from "~arktype/#6"
import $arkfixConfig from "~arktype/#7"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
$arkfixConfig()
export const A = /* @__PURE__ */ $ark#0(trim)
export const B = $ark#2(max)
export const D = $ark#5()
export const E = type({ "+": "delete", "[string]": "string", a: type("string.date.parse").or(type("number").pipe(trim)) })
export const F = /* @__PURE__ */ $ark#3()
export const G = type("string").equals("string")
export const H = $ark#4().meta
export const I = type({ a: "string" }).props[0].key
export const J = type({ a: "string" }).in.extends("object")
export const K = type("string").extends(type("string").in)`)
		})

		it("folds Modules", () => {
			const result = precompile(`import { scope, type } from "arktype"
export const types = scope({ tree: { value: "number", "children?": "tree[]" } }).export()
export const M = type.module({ a: "string", b: { c: "a" } })`)
			attest(result.diagnostics).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#3"
$arkfixConfig()
export const types = /* @__PURE__ */ $ark#0()
export const M = /* @__PURE__ */ $ark#2()`)
		})

		it("folds Scopes and Generics", () => {
			const result = precompile(`import { scope, type } from "arktype"
const $ = scope({ tree: { value: "number", "children?": "tree[]" }, "box<t>": { box: "t" } })
export const types = $.export()
export const Tree = $.type("tree")
export const Box = type("<t>", { box: "t" })
export const BoxedTree = Box(types.tree)`)
			attest(result.diagnostics).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { #4 as $ark#4 } from "~arktype/#1"
import { #5 as $ark#5 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#6"
$arkfixConfig()
const $ = /* @__PURE__ */ $ark#0()
export const types = /* @__PURE__ */ $ark#2()
export const Tree = /* @__PURE__ */ $ark#3()
export const Box = /* @__PURE__ */ $ark#4()
export const BoxedTree = /* @__PURE__ */ $ark#5()`)
		})

		it("Module aliases named like Type members", () => {
			const result = precompile(`import { scope } from "arktype"
const M = scope({ toJsonSchema: "string", json: { a: "number" } }).export()
export const schema = M.toJsonSchema.toJsonSchema()
export const json = M.json.json`)
			attest(result.diagnostics).equals([])
			attest(
				normalized(
					result.code.split("\n").filter(line => line.startsWith("export"))
				)
			).snap([
				"export const schema = /* @__PURE__ */ $ark#0()",
				"export const json = /* @__PURE__ */ $ark#1()"
			])
		})

		it("folds a Type returned through a Scope, Module or Generic", () => {
			const result = precompile(`import { scope, type } from "arktype"
const $ = scope({ a: "string", b: { c: "a" } })
const G = type("<t>", { box: "t" })
export const asserted = $.type("b").assert({ c: "x" })
export const allowed = G("string").allows({ box: "x" })
export const meta = $.type("b").meta
export const exported = $.export().b.assert({ c: "x" })
export const aliased = type.module({ b: "string" }).b.allows("x")
const validate = $.type("b")["~standard"].validate
export const validated = validate({ c: "x" })`)
			attest(result.diagnostics).equals([])
			attest(
				normalized(
					result.code.split("\n").filter(line => line.startsWith("export"))
				)
			).snap([
				'export const asserted = $ark#0().assert({ c: "x" })',
				'export const allowed = $ark#1().allows({ box: "x" })',
				"export const meta = $ark#2().meta",
				'export const exported = $ark#3().assert({ c: "x" })',
				'export const aliased = $ark#4().allows("x")',
				'export const validated = validate({ c: "x" })'
			])
		})

		it("refuses a Scope or Generic's json", () => {
			const result = precompile(`import { scope, type } from "arktype"
const $ = scope({ a: "string" })
const G = type("<t>", { x: "t" })
export const json = [$.json, G.json, scope({ "b<t>": { x: "t" } }).export().b.json]`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:4:22  $.json cannot be precompiled\n  `$.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
				'/main.ts:4:30  G.json cannot be precompiled\n  `G.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
				'/main.ts:4:38  scope({ "b<t>": { x: "t" } }).export().b.json cannot be precompiled\n  `scope({ "b<t>": { x: "t" } }).export().b.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
			])
		})

		it("receives a Scope read through members", () => {
			const result = precompile(`import { scope } from "arktype"
const isLong = (s: string) => s.length > 1
const $ = scope({ s: ["string", ":", isLong] })
export const F = $.type.fn("s")(s => s)
export const O = $.type.or("s", "number")`)
			attest(result.diagnostics).equals([])
			attest(
				normalized(
					result.code.split("\n").filter(line => line.startsWith("export"))
				)
			).snap([
				"export const F = $ark#0($, s => s)",
				"export const O = $ark#1($)"
			])
		})

		it("thunk aliases a site resolves", () => {
			const scopeOf = (name: string) => `scope({
		b: "3.14",
		a: ["number", "=>", stringify],
		aAndB: () => ${name}.type("a&b"),
		bAndA: () => ${name}.type("b&a")
	})`
			const result = precompile(
				`import { scope } from "arktype"
import { imported } from "./schemas.ts"
export const make = () => {
	const stringify = (data: number) => \`\${data}\`
	const $ = ${scopeOf("$")}
	const types = $.export()
	return types
}
export const Imported = imported.export()
export const A = imported.type("a[]")`,
				{
					"/schemas.ts": `import { scope } from "arktype"
const stringify = (data: number) => \`\${data}\`
export const imported = ${scopeOf("imported")}`
				}
			)
			attest(
				result.diagnostics.map(d => [d.line, d.message, ...d.reasons])
			).snap([
				[
					14,
					"imported.export() can't be precompiled yet",
					"`imported`'s alias `aAndB` is a thunk the site resolves, so a factory can't compare what it returns"
				]
			])
		})

		it("names the Scope of a received thunk alias", () => {
			const result = precompile(
				`import { holder } from "./schemas.ts"
export const A = holder.T.or("t")
export const B = holder.m.G("number")`,
				{
					"/schemas.ts": `import { scope } from "arktype"
const $ = scope({ "#t": () => $.type("string[]"), "G<x>": { v: "x", w: "t" } })
export const holder = { T: $.type("bigint"), m: $.export() }`
				}
			)
			attest(result.diagnostics.flatMap(d => d.reasons)).snap([
				"`holder.T.$`'s alias `t` is a thunk the site resolves, so a factory can't compare what it returns",
				"`holder.m.G.$`'s alias `t` is a thunk the site resolves, so a factory can't compare what it returns"
			])
		})

		it("keys a default's check by its traversal", () => {
			const result = precompile(
				`import { Holder } from "./holder.ts"
export const Defaulted = Holder.and({ p: ["number", "=", 5] })`,
				{
					"/holder.ts": `import { scope, type } from "arktype"
const isPositive = (n: number) => n > 0
const isNonEmpty = (s: string) => s.length > 0
const $ = scope({ positive: ["number", ":", isPositive], name: ["string", ":", isNonEmpty] })
export const Holder = type({ "p?": $.type("positive") })`
				}
			)
			attest(result.diagnostics).equals([])
		})

		it("a Scope narrow tested on literals", () => {
			const result = precompile(
				`import { types } from "./handlers.ts"
export const Aged = types.user.and({ age: "number" })
export const Coded = types.user.and({ c: "code" })`,
				{
					"/handlers.ts": `import { scope } from "arktype"
const isAllowed = (s: string) => s !== "b"
export const types = scope({ code: ["'a' | 'b'", ":", isAllowed], user: { name: "string" } }).export()`
				}
			)
			attest(result.diagnostics.map(d => [d.line, ...d.reasons])).snap([
				[
					3,
					"arktype calls `isAllowed` (/handlers.ts:2:19) while defining what `types.user.$` creates, so a factory can't compare it"
				]
			])
		})

		it("names a received Type's Scope", () => {
			const result = precompile(
				`import { types } from "./handlers.ts"
export const Users = types.user.array()`,
				{
					"/handlers.ts": `import { scope } from "arktype"
export const types = scope(
	{ user: { name: "string" } },
	{ domain: { message: ctx => \`bad \${ctx.path}\` } }
).export()`
				}
			)
			attest(result.diagnostics.flatMap(d => d.reasons)).snap([
				"`types.user.$` configures `domain.message` with a function, whose results decide what it creates, so a factory can't compare it"
			])
		})

		it("drops a site written inside a Scope it folds", () => {
			const result = precompile(`import { scope } from "arktype"
const create = () => {
	const $ = scope({ a: () => $.type("string") })
	const types = $.export()
	return types
}`)
			attest(result.diagnostics).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
const create = () => {
	const $ = $ark#0()
	const types = $ark#2()
	return types
}`)
		})

		it("definitions inside functions", () => {
			const result = precompile(`import { scope, type } from "arktype"
export const make = () => ({
	$: scope({ a: "string" }),
	types: type.module({ a: "string" }),
	Box: type("<t>", { box: "t" }),
	Trimmed: type("string.trim"),
	Text: type("string")
})`)
			attest(result.diagnostics).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { #4 as $ark#4 } from "~arktype/#1"
import { #5 as $ark#5 } from "~arktype/#1"
export const make = () => ({
	$: $ark#0(),
	types: $ark#2(),
	Box: $ark#3(),
	Trimmed: $ark#4(),
	Text: $ark#5()
})`)
		})

		it("leaves define calls' arguments", () => {
			const result = precompile(`import { define, scope, type } from "arktype"
const trim = (s: string) => s.trim()
export const A = define({ a: "string" })
export const B = scope({ a: "string" }).define(["a[]", "=>", trim])
export const C = type.define({ c: type("string") })`)
			attest(result.code).snap(`import { type } from "arktype"
const trim = (s: string) => s.trim()
export const A = ({ a: "string" })
export const B = (["a[]", "=>", trim])
export const C = type.define({ c: type("string") })`)
			attest(result.diagnostics.map(d => d.line)).equals([5])
		})

		it("reads JSX in a .js module", () => {
			const source = `import { type } from "arktype"
export const User = type({ name: "string" })
export const Name = () => <span>name</span>`
			const result = precompileModule(
				source,
				"/main.js",
				memoryHost({ "/main.js": source })
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(result.code).satisfies(
				/export const User = \/\* @__PURE__ \*\/ \$ark\w+\(\)\n/
			)
		})

		describe("rereads", () => {
			const files: Record<string, string> = {
				"/x.ts": 'export const shape = { a: "string" }',
				"/y.ts": 'import { shape as s } from "./x.ts"\nexport const shape = s',
				"/c.ts":
					'import { type } from "arktype"\nimport { shape } from "./y.ts"\nexport const V = type(shape)',
				"/b.ts":
					'import { type } from "arktype"\nimport { shape } from "./x.ts"\nimport { shape as again } from "./y.ts"\nexport const U = type(shape === again ? "string" : "number")'
			}
			const expressionsOf = (precompiler: Precompiler, id: string) =>
				precompiler
					.precompile(files[id], id)
					.sites.map(site => (site.value as { expression: string }).expression)

			it("in any order", () => {
				const precompiler = new Precompiler(memoryHost(files))
				for (const id of ["/y.ts", "/c.ts", "/x.ts"])
					precompiler.precompile(files[id], id)
				attest(expressionsOf(precompiler, "/b.ts")).equals(["string"])
			})

			it("given twice", () => {
				const precompiler = new Precompiler(memoryHost(files))
				for (const id of ["/x.ts", "/y.ts", "/b.ts", "/x.ts"])
					precompiler.precompile(files[id], id)
				attest(expressionsOf(precompiler, "/b.ts")).equals(["string"])
			})

			it("after a change", () => {
				const precompiler = new Precompiler(memoryHost(files))
				precompiler.precompile(files["/c.ts"], "/c.ts")
				precompiler.precompile('export const shape = { a: "number" }', "/x.ts")
				attest(expressionsOf(precompiler, "/c.ts")).equals(["{ a: number }"])
			})

			it("folds a module given again as before", () => {
				const source = `import { scope } from "arktype"
const $ = scope({ a: () => 42 })
export const exported = () => $.export()`
				const precompiler = new Precompiler(memoryHost({ "/main.ts": source }))
				const statusesOf = () =>
					precompiler
						.precompile(source, "/main.ts")
						.sites.map(site => `${site.line}:${site.column} ${site.status}`)
				const first = statusesOf()
				attest(first).snap(["2:11 accepted", "3:31 accepted"])
				attest(statusesOf()).equals(first)
			})
		})
	})

	describe("factories", () => {
		it("passes held functions to factories", () => {
			const source = `import { type } from "arktype"
import { ext } from "./ext.ts"
const trim = (s: string) => s.trim()
class Pet {}
const petTag = Symbol("petTag")
export const Name = type("string").pipe(trim).narrow((s, ctx) => s.length > 0)
export const User = type({ name: Name, pet: type.instanceOf(Pet), [petTag]: "string" })
export const Either = type("string").pipe(trim).or(type("number").pipe(trim))
export const Extended = type("string").pipe(ext)
export const Pair = type([Name, Either])
export const Short = Name.narrow(s => s.length < 9)
export const Stamped = type({ at: ["Date", "=", () => new Date()] })
class Kitten extends Pet {}
export const Kept = type.instanceOf(Pet).and(type.instanceOf(Kitten))`
			// a hole's name comes from its module and position, unique to this test
			const result = precompileModule(
				source,
				"/factories.ts",
				memoryHost({
					"/factories.ts": source,
					"/ext.ts": "export const ext = (s: string) => s"
				})
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { #4 as $ark#4 } from "~arktype/#1"
import { #5 as $ark#5 } from "~arktype/#1"
import { #6 as $ark#6 } from "~arktype/#1"
import { #7 as $ark#7 } from "~arktype/#1"
import { #8 as $ark#8 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#9"
import { ext } from "./ext.ts"
const trim = (s: string) => s.trim()
class Pet {}
const petTag = Symbol("petTag")
$arkfixConfig()
export const Name = /* @__PURE__ */ $ark#0(trim, (s, ctx) => s.length > 0)
export const User = $ark#2(Name, Pet, petTag)
export const Either = /* @__PURE__ */ $ark#3(trim)
export const Extended = $ark#4(ext)
export const Pair = $ark#5(Name, Either)
export const Short = $ark#6(Name, s => s.length < 9)
export const Stamped = /* @__PURE__ */ $ark#7(() => new Date())
class Kitten extends Pet {}
export const Kept = $ark#8(Pet, Kitten)`)
		})

		it("passes inputs after holes", () => {
			const source = `import { type } from "arktype"
import { max } from "./limits.ts"
import { reboxed } from "./reboxed.ts"
import { shape } from "./shapes.ts"
import * as limits from "./limits.ts"
const trim = (s: string) => s.trim()
const o = { name: "string", tags: ["string"] }
const alias = o
export const Local = type({ name: o.name }).pipe(trim)
export const Imported = type(\`string <= \${limits.max}\`).or({ tags: o.tags })
export const Added = type({ ...reboxed })
export const Namespaced = type({ ...limits.boxed })
const box = shape
export const Imports = ((shape: number) => type({ ...box }))(1)
export const Shadowed = (() => {
	const o = 1
	return type(alias.name)
})()`
			const result = precompileModule(
				source,
				"/inputs.ts",
				memoryHost({
					"/inputs.ts": source,
					"/limits.ts":
						'export const max = 5\nexport const boxed = { a: "string" }',
					"/shapes.ts": 'export const shape = { a: "number" }',
					"/reboxed.ts":
						'import { boxed } from "./limits.ts"\nexport const reboxed = boxed'
				})
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/inputs.ts:17:9  type(alias.name) can't be precompiled yet\n  `o` (/inputs.ts:7:7) is shadowed where the site is written, so its factory can't receive it\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(normalized(result.code)).snap(`import { type } from "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { #4 as $ark#4 } from "~arktype/#1"
import { #5 as $ark#5 } from "~arktype/#1"
import { max } from "./limits.ts"
import { reboxed } from "./reboxed.ts"
import { shape } from "./shapes.ts"
import * as limits from "./limits.ts"
const trim = (s: string) => s.trim()
const o = { name: "string", tags: ["string"] }
const alias = o
export const Local = $ark#0(trim, o)
export const Imported = $ark#2(limits.max, o)
export const Added = $ark#3(reboxed)
export const Namespaced = $ark#4(limits.boxed)
const box = shape
export const Imports = ((shape: number) => $ark#5($ark#6, box))(1)
export const Shadowed = (() => {
	const o = 1
	return type(alias.name)
})()
import { shape as $ark#6 } from "./shapes.ts"`)
		})

		it("inputs on an import cycle", () => {
			const helper = (name: string) =>
				`export function ${name}(extra: object) { return { a: "string", ...extra } }`
			const source = `import { type } from "arktype"
import { viaG, viaH, viaK } from "./app.ts"
import { g } from "./g.ts"
import { h } from "./h.ts"
export const G = type(viaG())
export const H = type(viaH())
export const K = type(viaK())
export const Direct = type(h({ c: "number" }))
let shape: typeof g`
			const result = precompileModule(
				source,
				"/main.ts",
				memoryHost({
					"/main.ts": source,
					"/app.ts": `import "./main.ts"
import { g } from "./g.ts"
import { h } from "./h.ts"
import { k } from "./k.ts"
export function viaG() { return g({ b: "number" }) }
export function viaH() { return h({ b: "number" }) }
export function viaK() { return k({ b: "number" }) }`,
					"/g.ts": helper("g"),
					"/h.ts": helper("h"),
					"/k.ts": helper("k")
				})
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:5:18  type(viaG()) can't be precompiled yet\n  importing `g` from /g.ts here could run it earlier than the program does, as /main.ts is on an import cycle\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				"/main.ts:7:18  type(viaK()) can't be precompiled yet\n  importing `k` from /k.ts here could run it earlier than the program does, as /main.ts is on an import cycle\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(normalized(result.code)).snap(`import { type } from "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#3"
import { viaG, viaH, viaK } from "./app.ts"
import { g } from "./g.ts"
import { h } from "./h.ts"
export const G = type(viaG())
export const H = $ark#0(viaH, h)
export const K = type(viaK())
$arkfixConfig()
export const Direct = /* @__PURE__ */ $ark#2()
let shape: typeof g`)
		})

		it("a ParseError site holding sites", () => {
			const result = precompile(`import { type } from "arktype"
export const M = type.module({
	a: type("missing").and(type({ b: "string" })),
	c: ["string", ":", (data: unknown) => type("string").allows(data)]
})`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:2:18  type.module({ a: type("missing").and(type({ b: "string" }))… throws a ParseError\n  \'missing\' is unresolvable\n  The precompiled site throws the same ParseError when it is created.'
			])
			attest(normalized(result.code)).snap(`import "arktype"
import $ark#0 from "~arktype/#1"
export const M = $ark#0()`)
		})

		it("a ParseError site holding functions", () => {
			const source = `import { scope, type } from "arktype"
import { extend } from "./extend.ts"
const isZero = (n: number) => n === 0
class Cat {}
class Dog {}
extend(Dog, Cat)
export const Narrowed = type("1").narrow(isZero)
export const Anonymous = type("1").narrow(n => n === 0)
export const Both = type.instanceOf(Dog).and(type.instanceOf(Cat))
export const Unrelated = type("1").and("2")
const isNegative = (n: number) => n < 0
const Negative = type("number").narrow(isNegative)
const DogT = type.instanceOf(Dog)
const CatT = type.instanceOf(Cat)
const fns = { f: (s: string) => s.length, g: (s: string) => s.trim() }
const M1 = type({ a: type("string").pipe(fns.f) })
const M2 = type({ a: type("string").pipe(fns.g) })
export const Referenced = type("1").and(Negative)
export const BothReferenced = DogT.and(CatT)
export const Morphs = M1.and(M2)
const negative = () => Negative
const dog = () => DogT
export const Helped = type("1").and(negative())
export const HelpedClass = type.instanceOf(Error).and(dog())
export const Scoped = scope({ a: DogT, b: "a & Error" }).export()
export const Props = type("number").props
export const NarrowedProps = type("number").narrow(isNegative).props`
			const result = precompileModule(
				source,
				"/thrower.ts",
				memoryHost({
					"/thrower.ts": source,
					"/extend.ts":
						"export const extend = (c: Function, base: Function) => Object.setPrototypeOf(c.prototype, base.prototype)"
				})
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/thrower.ts:7:25  type("1").narrow(isZero) can\'t be precompiled yet\n  arktype calls `isZero` (/thrower.ts:7:42)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/thrower.ts:8:26  type("1").narrow(n => n === 0) can\'t be precompiled yet\n  arktype calls `n => n === 0` (/thrower.ts:8:43)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:9:21  type.instanceOf(Dog).and(type.instanceOf(Cat)) can't be precompiled yet\n  arktype holds `Dog` (/thrower.ts:9:37)\n  arktype holds `Cat` (/thrower.ts:9:62)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:10:26  type("1").and("2") throws a ParseError\n  Intersection of 1 and 2 results in an unsatisfiable type\n  The precompiled site throws the same ParseError when it is created.',
				'/thrower.ts:18:27  type("1").and(Negative) can\'t be precompiled yet\n  arktype is passed a value holding `isNegative` (/thrower.ts:11:20)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:19:31  DogT.and(CatT) can't be precompiled yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  arktype is passed a value holding `Cat` (/thrower.ts:4:1)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				"/thrower.ts:20:23  M1.and(M2) can't be precompiled yet\n  arktype is passed a value holding `f` (/thrower.ts:15:18)\n  arktype is passed a value holding `g` (/thrower.ts:15:46)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:23:23  type("1").and(negative()) can\'t be precompiled yet\n  arktype is passed a value holding `isNegative` (/thrower.ts:11:20)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:24:28  type.instanceOf(Error).and(dog()) can't be precompiled yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:25:23  scope({ a: DogT, b: "a & Error" }).export() can\'t be precompiled yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/thrower.ts:26:22  type("number").props throws a ParseError\n  props operand must be an object (was number)\n  The precompiled site throws the same ParseError when it is created.',
				'/thrower.ts:27:30  type("number").narrow(isNegative).props can\'t be precompiled yet\n  arktype calls `isNegative` (/thrower.ts:27:52)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
		})

		it("checks exported helpers", () => {
			const source = `import { type } from "arktype"
import single, { list } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const own = (def: string) => list(def)
export const List = type(list("string"))
export const Own = type(own("number"))
export const Optional = type(helpers.optional("string"))
export const Single = type(single("string"))`
			const files = {
				"/checked.ts": source,
				"/helpers.ts": `import { suffix } from "./suffix.ts"
const base = (def: string) => \`\${def}[]\`
export const list = (def: string) => base(def)
export const optional = (def: string) => suffix(def, " | undefined")
export default (def: string) => def`,
				"/suffix.ts":
					"export const suffix = (def: string, s: string) => def + s"
			}
			const build = (id: keyof typeof files, checks?: "helpers") =>
				precompileModule(files[id], id, memoryHost(files), { checks })
			// a bundle runs the helpers the build read
			attest(build("/checked.ts").diagnostics).equals([])
			const checked = build("/checked.ts", "helpers")
			attest(checked.diagnostics.map(renderDiagnostic)).snap([
				"/checked.ts:8:23  type(single(\"string\")) can't be precompiled yet\n  `default` (/helpers.ts:5:16) is a static helper its module doesn't export through a binding, so a test driver can't register it\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(normalized(checked.code)).snap(`import { type } from "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import single, { list } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const own = (def: string) => list(def)
export const List = $ark#0(list)
export const Own = $ark#2(list)
export const Optional = $ark#3(helpers.optional, $ark#4)
export const Single = type(single("string"))
import { suffix as $ark#4 } from "./suffix.ts"`)
			attest(build("/helpers.ts", "helpers").code)
				.snap(`import { suffix } from "./suffix.ts"
const base = (def: string) => \`\${def}[]\`
export const list = (def: string) => base(def)
export const optional = (def: string) => suffix(def, " | undefined")
export default (def: string) => def
Object.assign((globalThis[Symbol.for("arktype.helpers")] ??= { __proto__: null }), { "/helpers.ts": { __proto__: null, "list": list, "optional": optional } })`)
		})

		it("passes a hole through each text", () => {
			const result = precompile(
				`import { type } from "arktype"
import { a } from "./a.ts"
import { alias } from "./b.ts"
const fns = { check: (s: string) => s.length > 3 }
const other = { check: fns.check }
const Name = type("string").narrow(fns.check)
export const Aliased = type("string").pipe(a).or(type("number").pipe(alias))
export const Checked = type({ a: type("string").narrow(other.check), b: type("string").narrow(fns.check), name: Name })`,
				{
					"/a.ts": "export const a = (s: string) => s",
					"/b.ts": 'export { a as alias } from "./a.ts"'
				}
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { a } from "./a.ts"
import { alias } from "./b.ts"
const fns = { check: (s: string) => s.length > 3 }
const other = { check: fns.check }
const Name = $ark#0(fns.check)
export const Aliased = $ark#2(a, alias)
export const Checked = $ark#3(other.check, fns.check, Name)`)
		})

		it("checks a shared binding once", () => {
			const result = precompile(
				`import { type } from "arktype"
import { Id } from "./id.ts"
export const User = type({ id: Id })
export const Post = type({ id: Id, author: Id })`,
				{
					"/id.ts": `import { type } from "arktype"
export const Id = type("string").narrow(s => s.length === 8)`
				}
			)
			attest(
				normalized(
					Object.entries(result.modules).flatMap(([specifier, module]) =>
						specifier.includes("receive") ? [module] : []
					)
				)
			).snap([
				'import * as runtime from "arktype/runtime"\n\nconst #0 = ((holder) => {\n\treturn runtime.holesOf(holder, "#1", "`Id`")\n})\n\nexport { #0 }\n'
			])
		})

		it("passes a Type for members validators lack", () => {
			const result = precompile(
				`import { type } from "arktype"
const tag = Symbol("tag")
const T = type({ [tag]: "0" }).or({ [tag]: "1" })
export const Union = T.internal.assertHasKind("union")
export const In = type({ a: T.in })`
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#4"
const tag = Symbol("tag")
$arkfixConfig()
const T = /* @__PURE__ */ $ark#0(tag)
export const Union = $ark#2(T)
export const In = $ark#3(T)`)
		})

		it("passes reads meaning the same at the site", () => {
			const result = precompile(
				`import { type } from "arktype"
const isLong = (s: string) => s.length > 1
const isShort = (s: string) => s.length < 3
const h = isLong
const fns = { isLong }
const shorts = () => [isShort]
const Long = type("string").narrow(isLong)
const N = type("string").narrow(isShort)
const longs = () => [Long]
export const Mapped = type([isLong].map(h => type("string").narrow(h)) as never)
export const Shadowed = type([type("string").narrow(h), ...shorts().map(h => type("string").narrow(h))] as never)
export const Renamed = type(Object.values(fns).map(h => type("string").narrow(h)) as never)
export const Through = type(longs().map(N => type({ n: N })) as never)
export const Either = type(shorts().map(h => type("string").narrow(h || isLong)) as never)
export const Own = type("string").narrow(function (this: unknown, s) { return s.length > 1 && !this })
export const OwnFirst = type("string").narrow(function (this: unknown, s) { return this === undefined && s.length > 1 })`
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:11:25  type([type("string").narrow(h), ...shorts().map(h => type("… can\'t be precompiled yet\n  arktype holds `(s: string) => s.length < 3` (/main.ts:3:17), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:12:24  type(Object.values(fns).map(h => type("string").narrow(h)) … can\'t be precompiled yet\n  arktype holds `(s: string) => s.length > 1` (/main.ts:2:16), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/main.ts:13:24  type(longs().map(N => type({ n: N })) as never) can't be precompiled yet\n  arktype holds `(s: string) => s.length > 1` (/main.ts:2:16), which the site cannot pass to its factory\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/main.ts:14:23  type(shorts().map(h => type("string").narrow(h || isLong)) … can\'t be precompiled yet\n  arktype holds `(s: string) => s.length < 3` (/main.ts:3:17), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(normalized(result.code)).snap(`import { type } from "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import { #3 as $ark#3 } from "~arktype/#1"
import { #4 as $ark#4 } from "~arktype/#1"
import { #5 as $ark#5 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#6"
const isLong = (s: string) => s.length > 1
const isShort = (s: string) => s.length < 3
const h = isLong
const fns = { isLong }
const shorts = () => [isShort]
$arkfixConfig()
const Long = /* @__PURE__ */ $ark#0(isLong)
const N = /* @__PURE__ */ $ark#2(isShort)
const longs = () => [Long]
export const Mapped = /* @__PURE__ */ $ark#3(isLong)
export const Shadowed = type([type("string").narrow(h), ...shorts().map(h => type("string").narrow(h))] as never)
export const Renamed = type(Object.values(fns).map(h => type("string").narrow(h)) as never)
export const Through = type(longs().map(N => type({ n: N })) as never)
export const Either = type(shorts().map(h => type("string").narrow(h || isLong)) as never)
export const Own = /* @__PURE__ */ $ark#4(function (this: unknown, s) { return s.length > 1 && !this })
export const OwnFirst = /* @__PURE__ */ $ark#5(function (this: unknown, s) { return this === undefined && s.length > 1 })`)
		})

		it("passes each created function", () => {
			const result = precompile(
				`import { type } from "arktype"
const longer = (n: number) => (s: string) => s.length > n
export const T = type("string").narrow(longer(3)).narrow(longer(1))`
			)
			attest(result.diagnostics).equals([])
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
const longer = (n: number) => (s: string) => s.length > n
export const T = $ark#0(longer(3), longer(1))`)
		})

		it("shares tables between factories", () => {
			const result = precompile(`import { scope, type } from "arktype"
const isLong = (s: string) => s.length > 1
const $1 = scope({ a: "string" })
const $2 = scope({ a: "string" })
export const A = type("string").narrow(isLong)
export const B = type("string").narrow(isLong)
export const C = $1.type("a").narrow(isLong)
export const D = $2.type("a").narrow(isLong)
export const E = $1.type("string").narrow(isLong)
export const fresh = () => scope({ a: "string" }).type("a").narrow(isLong)`)
			const artifact = result.modules[Object.keys(result.modules)[0]]
			// each factory's code ends at its export
			const tables = artifact
				.split(/^export { factory\d+ .*$/m)
				.slice(0, -1)
				.map(code => code.match(/runtime\.intern\(\((interned\d+)/)?.[1])
			attest(tables).equals([
				"interned0",
				"interned0",
				"interned1",
				"interned2",
				"interned1",
				"interned3"
			])
		})

		it("shares code with composing modules", () => {
			const files = {
				"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`,
				"/team.ts": `import { type } from "arktype"
import { User } from "./user.ts"
export const Team = type({ lead: User })`
			}
			const precompiler = new Precompiler(memoryHost(files))
			const user = precompiler.precompile(files["/user.ts"], "/user.ts")
			const team = precompiler.precompile(files["/team.ts"], "/team.ts")
			const shared = Object.keys(team.modules).filter(
				specifier => user.modules[specifier]
			)
			for (const specifier of shared)
				attest(team.modules[specifier]).equals(user.modules[specifier])
			attest(normalized(shared)).snap(["~arktype/#0"])
		})

		it("composes referenced Types' strings", () => {
			const files = {
				"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string", nickname: "string | undefined", age: "number.integer >= 0" })`,
				"/team.ts": `import { type } from "arktype"
import { User } from "./user.ts"
export const Team = type({ lead: User, members: User.array() })`
			}
			const precompiler = new Precompiler(memoryHost(files), {
				members: { expression: true, description: true }
			})
			const user = precompiler.precompile(files["/user.ts"], "/user.ts")
			const team = precompiler.precompile(files["/team.ts"], "/team.ts")
			const composed = Object.entries(team.modules).flatMap(
				([specifier, code]) =>
					(
						/^~arktype\/(expression|description)/.test(specifier) &&
						!user.modules[specifier]
					) ?
						[code]
					:	[]
			)
			attest(
				normalized(composed.join("\n").match(/^\treturn .* \+ .*/gm)!)
			).snap([
				'\treturn #0() + "[]"',
				'\treturn "{ lead: " + #0() + ", members: " + #1() + " }"',
				'\treturn "{ lead: " + #2() + ", members: " + #3() + " }"'
			])
		})

		it("Modules and Scopes as factories", () => {
			const result = precompile(
				`import { scope, type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
export const Held = type.module({ a: ["string", "=>", trim] })
export const Read = type.module({ a: \`string <= \${max}\` })
export const $ = scope({ a: ["string", "=>", trim] })
export const B = $.type({ b: "a" })`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics).equals([])
			attest(
				normalized(
					result.code.split("\n").filter(line => line.startsWith("export"))
				)
			).snap([
				"export const Held = /* @__PURE__ */ $ark#0(trim)",
				"export const Read = $ark#1(max)",
				"export const $ = /* @__PURE__ */ $ark#2(trim)",
				"export const B = $ark#3($)"
			])
		})

		it("shares a factory across Types by index", () => {
			// A and B share the pattern's RegExp, so they're created together
			const result = precompile(`import { scope } from "arktype"
const trim = (s: string) => s.trim()
export const $ = scope({ t: ["string", "=>", trim], s: "/^a/" })
export const A = $.type({ a: "s" })
export const B = $.type({ b: "s" })`)
			attest(result.diagnostics).equals([])
			attest(
				normalized(
					result.code.split("\n").filter(line => line.startsWith("export"))
				)
			).snap([
				"export const $ = /* @__PURE__ */ $ark#0(trim)",
				"export const A = $ark#1(0, $)",
				"export const B = $ark#1(1, $)"
			])
		})

		it("folds TypedFns", () => {
			const result = precompile(`import { type } from "arktype"
export const len = type.fn("string", ":", "number")(s => s.length)
export const make = () => type.fn("string")(s => s)`)
			attest(result.diagnostics).equals([])
			attest(
				normalized(
					result.code.split("\n").filter(line => line.startsWith("export"))
				)
			).snap([
				"export const len = /* @__PURE__ */ $ark#0(s => s.length)",
				"export const make = () => $ark#1(s => s)"
			])
		})
	})

	describe("cache", () => {
		it("imports units after the module's imports", () => {
			const source = `import { type } from "arktype"
let def = "string"
def = "number"
export const Trimmed = type("string").pipe(s => s.trim())
export const T = type(def)
import { other } from "./other.ts"`
			const result = precompile(
				source,
				{ "/other.ts": "export const other = 1" },
				{ runtime: "arktype" }
			)
			attest(normalized(result.code)).snap(`import { type } from "arktype"
import "~arktype/units/#0"
import "~arktype/units/#1"
let def = "string"
def = "number"
export const Trimmed = type("string").pipe(s => s.trim())
export const T = type(def)
import { other } from "./other.ts"`)
			attest(result.diagnostics.map(d => `${d.rule} ${d.severity}`)).snap([
				"R1 warning"
			])
			attest(Object.values(result.modules)[0].split("\n")[0]).snap(
				'import { registerPrecompiledUnits } from "arktype/internal/precompiled.js"'
			)
		})

		it("leaves a module without sites unchanged", () => {
			const result = precompile(
				`import { type } from "arktype"
export const isError = (data: unknown) => data instanceof type.errors`,
				{},
				{ runtime: "arktype" }
			)
			attest([result.map, result.modules]).equals([undefined, {}])
		})
	})

	describe("inline", () => {
		it("passes shadowed globals", () => {
			const result = precompile(
				`import { type } from "arktype"
const Array = "shadowed"
export const T = type("string[]")
export const E = type("strng")`,
				{},
				{ inline: true }
			)
			const lines = result.code.split("\n")
			attest(normalized([lines[0], ...lines.slice(-12)])).snap([
				"var $ark$exports0;",
				"})($ark$0))",
				"}",
				"function $arkfixConfig(...args) {",
				'return $ark$load2()["default"](...args)',
				"}",
				"$ark$load2();",
				'import "arktype"',
				'import * as $ark$0 from "arktype/runtime"',
				'const Array = "shadowed"',
				"$arkfixConfig()",
				"export const T = /* @__PURE__ */ $ark#0()",
				"export const E = $ark#1()"
			])
			attest(result.modules).equals({})
		})

		it("units for a Scope's exports", () => {
			const unitsOf = (source: string) =>
				Object.keys(
					precompile(
						`import { scope, type } from "arktype"\n${source}`,
						{},
						{ runtime: "arktype" }
					).modules
				).filter(specifier => specifier.startsWith("~arktype/units/"))
			const units = unitsOf(`export const User = type({ name: "string" })`)
			attest(
				unitsOf(`export const $ = scope({ user: { name: "string" } })`)
			).equals(units)
			attest(
				unitsOf(
					`export const types = scope({ user: { name: "string" } }).export()`
				)
			).equals(units)
		})

		it("inlines a module's units", () => {
			const lines = precompile(
				`import "./config.ts"
import { type } from "arktype"
export const T = type("string[]")`,
				{},
				{ inline: true, runtime: "arktype" }
			).code.split("\n")
			attest([lines[0], ...lines.slice(-5)]).snap([
				';(({ "registerPrecompiledUnits": registerPrecompiledUnits }) => {',
				"})($ark$0);",
				'import "./config.ts"',
				'import { type } from "arktype"',
				'import * as $ark$0 from "arktype/internal/precompiled.js"',
				'export const T = type("string[]")'
			])
		})
	})

	it("modules defining Types", () => {
		const files = {
			"/ark.ts": 'export { type } from "arktype"',
			"/schemas.ts":
				'import { type } from "./ark.ts"\nexport const User = type({ name: "string" })',
			"/helpers.ts":
				'import { type } from "arktype"\nexport const field = (n: number) => type(`string <= ${n}`)',
			"/all.ts": 'export * from "./schemas.ts"',
			"/forms.ts":
				'import { type } from "arktype"\nexport function make() {\n\tconst User = type({ name: "string" })\n\treturn { User }\n}',
			"/errors.ts": 'export { ArkErrors } from "arktype"',
			"/check.ts":
				'import { User } from "./schemas.ts"\nexport const isUser = (data: unknown) => User.allows(data)',
			"/math.ts": "export const add = (a: number, b: number) => a + b"
		}
		const precompiler = new Precompiler(memoryHost(files))
		attest(
			Object.keys(files).map(
				file =>
					`${file} ${precompiler.importsArk(`import { x } from ".${file}"`, "/main.ts")}`
			)
		).snap([
			"/ark.ts true",
			"/schemas.ts true",
			"/helpers.ts true",
			"/all.ts true",
			"/forms.ts true",
			"/errors.ts false",
			"/check.ts false",
			"/math.ts false"
		])
	})

	it("modules reading arktype's nodes", () => {
		const standalone = new Precompiler(memoryHost({}))
		const cached = new Precompiler(memoryHost({}), { runtime: "arktype" })
		attest(
			[
				'import { discriminate } from "arksets"',
				'import { hasArkKind } from "@ark/schema"',
				'import { ArkErrors } from "@ark/schema/runtime"'
			].map(
				source =>
					`${source} ${standalone.importsArk(source, "/helpers.ts")} ${cached.importsArk(source, "/helpers.ts")}`
			)
		).snap([
			'import { discriminate } from "arksets" true false',
			'import { hasArkKind } from "@ark/schema" true false',
			'import { ArkErrors } from "@ark/schema/runtime" false false'
		])
	})

	it("keeps sites apart by scope config", () => {
		const { code } = precompile(`import { scope } from "arktype"
export const Custom = scope({}, { domain: { description: () => "custom" } }).type({ x: "string" })
export const Default = scope({}).type({ x: "string" })`)
		attest(
			normalized(code.split("\n").filter(line => line.startsWith("export")))
		).snap([
			"export const Custom = /* @__PURE__ */ $ark#0()",
			"export const Default = /* @__PURE__ */ $ark#1()"
		])
	})

	it("same modules after unrelated work", () => {
		const ids = [
			...["main.ts", "dates.ts", "numbers.ts", "local.ts"].map(file =>
				fromHere("environments", file)
			),
			fromHere("app", "main.ts")
		]
		const unrelated = fromHere("app", "admin.ts")
		const build = (order: string[], runtime?: "arktype") => {
			const precompiler = new Precompiler(
				createNodeHost({ conditions: ["ark-ts"] }),
				{ runtime }
			)
			const results = Object.fromEntries(
				order.map(id => [
					id,
					precompiler.precompile(readFileSync(id, "utf8"), id)
				])
			)
			return ids.map(id => [results[id].code, results[id].modules])
		}
		for (const runtime of [undefined, "arktype"] as const) {
			const first = build(ids, runtime)
			for (let i = 0; i < 40; i++) {
				type({ [`k${i}`]: `number > ${i}` })
				type({ value: `number > ${i}`, "next?": "this" })
			}
			const { tree } = scope({
				After: "Date > d'2001-01-01T00:00:00.000Z'",
				tree: { "children?": "tree[]" }
			}).export()
			let deep: unknown = {}
			for (let i = 0; i < 100; i++) deep = { children: [deep] }
			tree(deep)
			attest(build([unrelated, ...[...ids].reverse()], runtime)).equals(first)
		}
	})

	it("writes a Type the same in any order", () => {
		const files = {
			"/string.ts": `import { type } from "arktype"
export const A = type({ a: "string" })`,
			"/keyof.ts": `import { type } from "arktype"
export const B = type({ a: type({ "[string]": "number" }).keyof() })`
		}
		const first = builtInOrder(files, ["/string.ts", "/keyof.ts"])
		attest(builtInOrder(files, ["/keyof.ts", "/string.ts"])).equals(first)
	})

	it("meta objects in any order", () => {
		const files = {
			"/a.ts": `import { type } from "arktype"
export const A = type({ a: "number" }).configure({ examples: [{ a: 1 }] })`,
			"/b.ts": `import { type } from "arktype"
export const B = type({ a: "number" }).configure({ examples: [{ a: 2 }] })`
		}
		const together = builtInOrder(files, ["/a.ts", "/b.ts"])
		attest(builtInOrder(files, ["/b.ts", "/a.ts"])).equals(together)
	})
})
