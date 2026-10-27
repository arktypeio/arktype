import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	createNodeHost,
	precompileModule,
	Precompiler,
	renderDiagnostic
} from "@ark/aot"
import { scope, type } from "arktype"
import { readFileSync } from "node:fs"
import { inFreshProcess, memoryHost, normalized, precompile } from "./utils.ts"

// each module's code and modules, built in the order given
const builtInOrder = (files: Record<string, string>, order: string[]) =>
	inFreshProcess(
		async (files: Record<string, string>, order: string[]) => {
			const { memoryHost } = await import("./utils.ts")
			const { Precompiler } = await import("@ark/aot")
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

// a module's code but for the imports of its validators, which "folds sites to
// validators" pins
const foldedCode = (code: string) =>
	normalized(code)
		.split("\n")
		.filter(
			line => !/^import { #\d+ as \$ark#\d+ } from "~arktype\//.test(line)
		)
		.join("\n")

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
				"~arktype/#4",
				"~arktype/#5",
				"~arktype/#6"
			])
			attest(result.map?.sources).equals(["/main.ts"])
		})

		it("lets a bundler drop a function's unread Type where creating fixes no config", () => {
			const source = `import { type } from "arktype"
const trim = (s: string) => s.trim()
export const productOf = () => {
	const Image = type({ id: "number" })
	const Trimmed = type("string").pipe(trim)
	return type({ images: Image.array() })
}`
			const bodyOf = (code: string) =>
				normalized(code).split("\n").slice(-4, -1)
			attest(bodyOf(precompile(source, {}, { config: false }).code)).snap([
				"\tconst Image = /* @__PURE__ */ $ark#0()",
				"\tconst Trimmed = $ark#2(trim)",
				"\treturn $ark#3()"
			])
			// creating its first Type fixes the config, as arktype's would
			attest(bodyOf(precompile(source).code)).snap([
				"\tconst Image = $ark#0()",
				"\tconst Trimmed = $ark#2(trim)",
				"\treturn $ark#3()"
			])
		})

		it("names its locals without a leading $ in a module Svelte compiles", () => {
			// Svelte refuses a name beginning with $ there, as it reads one as a rune
			const source = `import { type } from "arktype"
export const Quantity = type("number.integer > 0")
export const cartOf = () => {
	let count = $state(0)
	return { add: (n: unknown) => Quantity.assert(n) + count }
}`
			const result = precompileModule(
				source,
				"/cart.svelte.ts",
				memoryHost({ "/cart.svelte.ts": source })
			)
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as ark$#0 } from "~arktype/#1"
import ark$fixConfig from "~arktype/#2"
ark$fixConfig()
export const Quantity = /* @__PURE__ */ ark$#0()
export const cartOf = () => {
	let count = $state(0)
	return { add: (n: unknown) => Quantity.assert(n) + count }
}`)
		})

		it("reads validators created eagerly and checking nothing", () => {
			const result = precompile(
				`import { type } from "arktype"
import { User } from "./user.ts"
export const Name = type("string")
export const Team = type({ lead: User })`,
				{
					"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
				},
				{ lazy: false, creationChecks: "none" }
			)
			// user.ts runs first, so reading User here can't throw
			attest(foldedCode(result.code)).snap(`import "arktype"
import $arkfixConfig from "~arktype/#3"
import { User } from "./user.ts"
$arkfixConfig()
export const Name = $ark#0
export const Team = $ark#2`)
		})

		it("reads an input where reading it can throw, as arktype does", () => {
			const result = precompile(
				`import { type } from "arktype"
import { User } from "./user.ts"
export const Team = type({ lead: User })`,
				{
					"/user.ts": `import { type } from "arktype"
import "./main.ts"
export const User = type({ name: "string" })`
				},
				{ lazy: false, creationChecks: "none" }
			)
			// on a cycle with user.ts, which can run this before setting User
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#2"
import { User } from "./user.ts"
$arkfixConfig()
export const Team = (User, $ark#0)`)
		})

		it("creates a size build's validators where they're read", () => {
			const result = precompile(
				`import { type } from "arktype"
import { User } from "./user.ts"
export const Name = type("string > 0")
export const Team = type({ lead: User, members: User.array() })`,
				{
					"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
				},
				{ preset: "smallest", creationChecks: "none", config: false }
			)
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark_#0 } from "~arktype/#1"
import { #2Allows as $ark_#2Allows } from "~arktype/#1"
import { #3Allows as $ark_#3Allows } from "~arktype/#1"
import { User } from "./user.ts"
export const Name = /* @__PURE__ */ $ark_#0($ark_#2Allows)
export const Team = /* @__PURE__ */ $ark_#0($ark_#3Allows)`)
		})

		it("creates a lazy build's validators where a module reads them as it loads", () => {
			const result = precompile(
				`import { type, type Type } from "arktype"
export const Name = type("string > 0")
export const Id = type("string > 2") satisfies Type<string>
export const nameOf = () => type("string > 1")`,
				{},
				{ creationChecks: "none", config: false }
			)
			attest(normalized(result.code)).snap(`import "arktype"
import { #0 as $ark_#0 } from "~arktype/#1"
import { #2 as $ark_#2 } from "~arktype/#1"
import { #3 as $ark_#3 } from "~arktype/#1"
import { #4 as $ark_#4 } from "~arktype/#1"
import { #5 as $ark_#5 } from "~arktype/#1"
import { #6 as $ark#6 } from "~arktype/#1"
export const Name = /* @__PURE__ */ $ark_#0($ark_#2, $ark_#3)
export const Id = /* @__PURE__ */ $ark_#0($ark_#4, $ark_#5) satisfies Type<string>
export const nameOf = () => $ark#6()`)
		})

		it("compiles a size build's artifact too small for checkers to pay off", () => {
			const checks = (source: string) =>
				Object.values(
					precompile(
						`import { type } from "arktype"\n${source}`,
						{},
						{
							preset: "smallest",
							creationChecks: "none",
							config: false
						}
					).modules
				).some(module => module.includes("runtime.props("))
			attest([
				checks(
					`export const Login = type({ email: "string.email", password: "8 <= string <= 64" })`
				),
				checks(`export const Moltar = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: { foo: "string", num: "number", bool: "boolean" }
})`)
			]).equals([false, true])
		})

		it("compiles a size build's Type that another compiles as its input", () => {
			const modules = Object.values(
				precompile(
					`import { type } from "arktype"
export const Moltar = type({
	number: "number",
	string: "string",
	boolean: "boolean",
	deeplyNested: { foo: "string", num: "number", bool: "boolean" }
})
export const MoltarSafe = Moltar.onDeepUndeclaredKey("delete")
export const User = type({ name: "string", age: "number", tags: "string[]" })
export const Team = type({ id: "string", lead: User, members: User.array() })
export const Item = type({ sku: "string", price: { amount: "number", currency: "string" } })`,
					{},
					{ preset: "smallest", creationChecks: "none", config: false }
				).modules
			).join("\n")
			// MoltarSafe can't be checkers, so its input Moltar is compiled with it
			attest([
				/runtime\.props\(/.test(modules),
				/runtime\.props\({[^\n]*deeplyNested/.test(modules)
			]).equals([true, false])
		})

		it("folds introspection", () => {
			const result = precompile(
				`import { type } from "arktype"
import { User } from "./user.ts"
const Point = type({ x: "number" })
export const json = Point.json
export const schema = Point.toJsonSchema()
export const userJson = User.toJSON()
export const properties = Point.toJsonSchema().properties
export const required = Point.toJsonSchema()["required"]`,
				{
					"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
				}
			)
			attest(result.diagnostics).equals([])
			attest(foldedCode(result.code)).snap(`import "arktype"
import $arkfixConfig from "~arktype/#7"
import { User } from "./user.ts"
import "./user.ts"
$arkfixConfig()
const Point = /* @__PURE__ */ $ark#0()
export const json = /* @__PURE__ */ $ark#2()
export const schema = /* @__PURE__ */ $ark#3()
export const userJson = /* @__PURE__ */ $ark#4()
export const properties = $ark#5().properties
export const required = $ark#6()["required"]`)
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

		it("folds introspection of a Type a Module the site creates holds", () => {
			const result = precompile(`import { type } from "arktype"
export const expression = type.module({ a: "string > 5" }).a.expression`)
			attest(result.diagnostics).equals([])
			// called with nothing, as what its Type holds the site creates
			attest(foldedCode(result.code)).snap(`import "arktype"
import $arkfixConfig from "~arktype/#2"
$arkfixConfig()
export const expression = /* @__PURE__ */ $ark#0()`)
		})

		it("refuses the expression of a Type narrowed by a function the validator doesn't receive", () => {
			const result = precompile(`import { type } from "arktype"
const isTruthy = (data: unknown) => !!data
export const expression = type.module({ a: ["string", ":", isTruthy] }).a.expression`)
			attest(result.diagnostics.map(d => d.reasons)).snap([
				[
					"the name of isTruthy, which the validator doesn't receive can't be precompiled to a standalone validator"
				]
			])
		})

		it("refuses a JSON Schema calling a thunk", () => {
			const result = precompile(`import { type } from "arktype"
const T = type({ a: ["number[]", "=", () => []] })
export const schema = T.toJsonSchema()`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:3:23  T.toJsonSchema() can't be precompiled yet\n  a JSON Schema calling a default's thunk can't be precompiled to a standalone validator\n  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime."
			])
			const refused = result.sites[1]
			attest([refused.status, refused.value]).equals(["rejected", undefined])
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
				"/main.ts:6:18  type(\"strin\") throws a ParseError\n  'strin' is unresolvable\n  Fix the definition, which throws the same ParseError at runtime, or set allowUnsafe: true to build anyway, with a warning.",
				'/main.ts:7:18  type({ "+": "delete", "[string]": "string", a: type("string… can\'t be precompiled yet\n  structure { [string]: string, a: (In: string.date) => Out<Date> | (In: number) => Out<unknown>, + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.',
				'/main.ts:9:18  type("string").equals("string") can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type("string").equals`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.',
				'/main.ts:11:18  type({ a: "string" }).props[0].key can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type({ a: "string" }).props`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.',
				'/main.ts:12:18  type({ a: "string" }).in.extends("object") can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type({ a: "string" }).in.extends`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.',
				'/main.ts:13:18  type("string").extends(type("string").in) can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type("string").extends`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.'
			])
			attest(foldedCode(result.code)).snap(`import { type } from "arktype"
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

		it("refuses .encode of a morph without an inverse", () => {
			const result = precompile(`import { type } from "arktype"
import "arktype/codecs"
const T = type("string").pipe(s => s.length)
export const encode = (v: unknown) => T.encode(v)`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:4:39  T.encode throws a ParseError\n  A morph must have an inverse to be encoded: (In: string) => Out<unknown>\n  Fix the definition, which throws the same ParseError at runtime, or set allowUnsafe: true to build anyway, with a warning."
			])
			attest(
				normalized(
					result.code.split("\n").filter(line => line.startsWith("const T"))
				)
			).snap(["const T = /* @__PURE__ */ $ark#0(s => s.length)"])
		})

		it("refuses a Scope or Generic's json", () => {
			const result = precompile(`import { scope, type } from "arktype"
const $ = scope({ a: "string" })
const G = type("<t>", { x: "t" })
export const json = [$.json, G.json, scope({ "b<t>": { x: "t" } }).export().b.json]`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:4:22  $.json cannot be precompiled\n  `$.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or put // @ark-runtime on the line before it, so arktype defines it at runtime.",
				"/main.ts:4:30  G.json cannot be precompiled\n  `G.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or put // @ark-runtime on the line before it, so arktype defines it at runtime.",
				'/main.ts:4:38  scope({ "b<t>": { x: "t" } }).export().b.json cannot be precompiled\n  `scope({ "b<t>": { x: "t" } }).export().b.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or put // @ark-runtime on the line before it, so arktype defines it at runtime.'
			])
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

		it("rereads a module after a change", () => {
			const files: Record<string, string> = {
				"/x.ts": 'export const shape = { a: "string" }',
				"/y.ts": 'import { shape as s } from "./x.ts"\nexport const shape = s',
				"/c.ts":
					'import { type } from "arktype"\nimport { shape } from "./y.ts"\nexport const V = type(shape)'
			}
			const precompiler = new Precompiler(memoryHost(files))
			precompiler.precompile(files["/c.ts"], "/c.ts")
			precompiler.precompile('export const shape = { a: "number" }', "/x.ts")
			attest(
				precompiler
					.precompile(files["/c.ts"], "/c.ts")
					.sites.map(site => (site.value as { expression: string }).expression)
			).equals(["{ a: number }"])
		})
	})

	describe("factories", () => {
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
				"/inputs.ts:17:9  type(alias.name) can't be precompiled yet\n  `o` (/inputs.ts:7:7) is shadowed where the site is written, so its factory can't receive it\n  Rename the `o` declared around the site, which hides the one it reads."
			])
			attest(foldedCode(result.code)).snap(`import { type } from "arktype"
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
				"/main.ts:5:18  type(viaG()) can't be precompiled yet\n  importing `g` from /g.ts here could run it earlier than the program does, as /main.ts is on an import cycle\n  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.",
				"/main.ts:7:18  type(viaK()) can't be precompiled yet\n  importing `k` from /k.ts here could run it earlier than the program does, as /main.ts is on an import cycle\n  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime."
			])
			attest(foldedCode(result.code)).snap(`import { type } from "arktype"
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
			const build = (id: keyof typeof files, creationChecks?: "helpers") =>
				precompileModule(files[id], id, memoryHost(files), { creationChecks })
			// a bundle runs the helpers the build read
			attest(build("/checked.ts").diagnostics).equals([])
			const checked = build("/checked.ts", "helpers")
			attest(checked.diagnostics.map(renderDiagnostic)).snap([
				"/checked.ts:8:23  type(single(\"string\")) can't be precompiled yet\n  `default` (/helpers.ts:5:16) is a static helper its module doesn't export through a binding, so a test driver can't register it\n  Export it by name, as `export const helper = ...`, and import that name, so a test driver can register it."
			])
			attest(foldedCode(checked.code)).snap(`import { type } from "arktype"
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

		it("passes each created function", () => {
			const result = precompile(
				`import { type } from "arktype"
const longer = (n: number) => (s: string) => s.length > n
export const T = type("string").narrow(longer(3)).narrow(longer(1))`
			)
			attest(result.diagnostics).equals([])
			attest(foldedCode(result.code)).snap(`import "arktype"
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
			attest(foldedCode(result.code)).snap(`import { type } from "arktype"
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
				"})($ark$0$fixConfig)) : $ark$exports2)",
				"}",
				"function $arkfixConfig(...args) {",
				'return $ark$load2()["default"](...args)',
				"}",
				"$ark$load2();",
				'import "arktype"',
				'import { siteOf as $ark$0$siteOf, freeze as $ark$0$freeze, unreadCallErrors as $ark$0$unreadCallErrors, UnreadArkErrors as $ark$0$UnreadArkErrors, fixConfig as $ark$0$fixConfig, createValidatorWith as $ark$0$createValidatorWith, precompiledForArktype_$version as $ark$0$precompiledForArktype_$version, ParseError as $ark$0$ParseError } from "arktype/runtime"',
				'const Array = "shadowed"',
				"$arkfixConfig()",
				"export const T = /* @__PURE__ */ $ark#0()",
				"export const E = $ark#1()"
			])
			attest(result.modules).equals({})
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
				";((registerPrecompiledUnits) => {",
				"})($ark$0$registerPrecompiledUnits);",
				'import "./config.ts"',
				'import { type } from "arktype"',
				'import { registerPrecompiledUnits as $ark$0$registerPrecompiledUnits } from "arktype/internal/precompiled.js"',
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

	it("writes Types and meta the same in any order", () => {
		const files = {
			"/string.ts": `import { type } from "arktype"
export const A = type({ a: "string" })`,
			"/keyof.ts": `import { type } from "arktype"
export const B = type({ a: type({ "[string]": "number" }).keyof() })`,
			"/a.ts": `import { type } from "arktype"
export const A = type({ a: "number" }).configure({ examples: [{ a: 1 }] })`,
			"/b.ts": `import { type } from "arktype"
export const B = type({ a: "number" }).configure({ examples: [{ a: 2 }] })`
		}
		const ids = Object.keys(files)
		attest(builtInOrder(files, [...ids].reverse())).equals(
			builtInOrder(files, ids)
		)
	})
})
