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

		it("leaves a Scope to arktype with a site the writer refuses reading it", () => {
			const result = precompile(`import { scope } from "arktype"
const unit = { toJSON: () => ({ tag: "u" }) }
const $ = scope({})
export const T = $.type({ k: $.type.unit(unit) }).or({ k: "'b'", v: "number" })`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:3:11  scope({}) is left to arktype\n  $.type({ k: $.type.unit(unit) }).or({ k: "\'b\'", v: "number"… (/main.ts:4:18) reads `$` but isn\'t precompiled, so arktype must define `$` for it',
				'/main.ts:4:18  $.type({ k: $.type.unit(unit) }).or({ k: "\'b\'", v: "number"… can\'t be precompiled yet\n  the unit {"tag":"u"} can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.'
			])
			attest(result.sites.map(site => site.status)).equals([
				"rejected",
				"rejected"
			])
			// the stand-in that replaced the Scope would lack `type`
			attest(foldedCode(result.code)).snap(`import { scope } from "arktype"
const unit = { toJSON: () => ({ tag: "u" }) }
const $ = scope({})
export const T = $.type({ k: $.type.unit(unit) }).or({ k: "'b'", v: "number" })`)
		})

		it("leaves a Scope to arktype with another module's refused site reading it", () => {
			const files = {
				"/scope.ts": `import { scope } from "arktype"
export const $ = scope({})`,
				"/main.ts": `import { $ } from "./scope.ts"
const unit = { toJSON: () => ({ tag: "u" }) }
export const T = $.type({ k: $.type.unit(unit) }).or({ k: "'b'", v: "number" })`
			}
			// the reader first, so the Scope's module is written without a stand-in
			let precompiler = new Precompiler(memoryHost(files))
			const reader = precompiler.precompile(files["/main.ts"], "/main.ts")
			attest(reader.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:3:18  $.type({ k: $.type.unit(unit) }).or({ k: "\'b\'", v: "number"… can\'t be precompiled yet\n  the unit {"tag":"u"} can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.'
			])
			const left = precompiler.precompile(files["/scope.ts"], "/scope.ts")
			attest(left.diagnostics.map(renderDiagnostic)).snap([
				'/scope.ts:2:18  scope({}) is left to arktype\n  $.type({ k: $.type.unit(unit) }).or({ k: "\'b\'", v: "number"… (/main.ts:3:18) reads `$` but isn\'t precompiled, so arktype must define `$` for it'
			])
			attest(left.code).equals(files["/scope.ts"])
			// the Scope's module first, so the reader's module fails the build
			precompiler = new Precompiler(memoryHost(files))
			const written = precompiler.precompile(files["/scope.ts"], "/scope.ts")
			attest(written.diagnostics).equals([])
			const failed = precompiler.precompile(files["/main.ts"], "/main.ts")
			attest(
				failed.diagnostics.map(d => [d.severity, renderDiagnostic(d)])
			).snap([
				[
					"error",
					'/main.ts:3:18  $.type({ k: $.type.unit(unit) }).or({ k: "\'b\'", v: "number"… can\'t be precompiled yet\n  the unit {"tag":"u"} can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.'
				],
				[
					"error",
					'/main.ts:3:18  $.type({ k: $.type.unit(unit) }).or({ k: "\'b\'", v: "number"… reads `$`, which the build replaced with an object that lacks its members\n  `$` is scope({}) (/scope.ts:2:18), a Scope precompiled before $.type({ k: $.type.unit(unit) }).or({ k: "\'b\'", v: "number"… was refused\n  Put // @ark-runtime on the line before scope({}), so arktype defines it at runtime, or build with runtime: "arktype".'
				]
			])
		})

		it("passes the import binding a site names where its module imports the holder twice", () => {
			const files = {
				"/holders.ts": `import { type } from "arktype"
export const Ta = type("string")
export const Tb = type("number")
export const H = { a: Ta, b: Tb }`,
				"/reexport.ts": `export { H as R } from "./holders.ts"`,
				"/main.ts": `import { type } from "arktype"
import { H, Tb } from "./holders.ts"
import { R } from "./reexport.ts"
H.a = Tb
export const A = type({ a: R.a })`
			}
			const precompiler = new Precompiler(memoryHost(files))
			const { code, sites } = precompiler.precompile(
				files["/main.ts"],
				"/main.ts"
			)
			attest(sites.map(site => site.status)).equals(["accepted"])
			// a mock of reexport.ts, as a test's, reaches the site only through `R`
			attest(/\$ark\w+\(R\)/.test(code)).equals(true)
			attest(code.includes("(H)")).equals(false)
		})

		it("refuses a site whose baked introspection is over the limit", () => {
			// a dag's json and JSON Schema repeat each Type they reference
			const files = {
				"/main.ts": `import { type } from "arktype"
const Leaf = type({ name: "string" })
const Pair = type({ a: Leaf.array(), b: Leaf.array() })
export const Deep = type({ a: Pair.array(), b: Pair.array() })
export const Shallow = type({ a: Leaf.array() })`
			}
			const precompiler = new Precompiler(memoryHost(files), {
				members: { json: true, toJsonSchema: true },
				bakedLimit: 1500
			})
			const { diagnostics, sites } = precompiler.precompile(
				files["/main.ts"],
				"/main.ts"
			)
			attest(sites.map(site => site.status)).equals([
				"accepted",
				"accepted",
				"rejected",
				"accepted"
			])
			attest(diagnostics.map(d => [d.severity, renderDiagnostic(d)])).snap([
				[
					"error",
					"/main.ts:4:21  type({ a: Pair.array(), b: Pair.array() }) can't be precompiled yet\n  its introspection bakes 1.6 KB of text (json 790 chars, toJsonSchema 835 chars), over the 1.5 KB a site may, as json and a JSON Schema repeat each Type they reference. Read fewer of its members, or leave it to arktype with // @ark-runtime or runtime: \"arktype\"\n  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime."
				]
			])
		})

		it("leaves a Scope to arktype that a refused site reads through a holder or alias", () => {
			const files = {
				"/holders.ts": `import { scope } from "arktype"
export const H = { $: scope({ a: "string" }), alt: scope({ a: "number" }) }
export const $ = scope({ b: "string" })`,
				"/main.ts": `import { H, $ } from "./holders.ts"
declare const flag: boolean
const chosen = flag ? H.alt : H.$
const direct = $
export const A = H.$.type("a | null")
export const B = chosen.type("a")
export const C = direct.type(flag ? "b" : "b | null")`
			}
			let precompiler = new Precompiler(memoryHost(files))
			const reader = precompiler.precompile(files["/main.ts"], "/main.ts")
			// `chosen.type("a")` is refused as a read off what may be a Scope, without a site
			attest(reader.sites.map(site => site.status)).equals([
				"accepted",
				"rejected"
			])
			const left = precompiler.precompile(files["/holders.ts"], "/holders.ts")
			attest(left.diagnostics.map(renderDiagnostic)).snap([
				'/holders.ts:2:23  scope({ a: "string" }) is left to arktype\n  chosen.type("a") (/main.ts:6:18) reads `chosen` but isn\'t precompiled, so arktype must define `chosen` for it',
				'/holders.ts:2:52  scope({ a: "number" }) is left to arktype\n  chosen.type("a") (/main.ts:6:18) reads `chosen` but isn\'t precompiled, so arktype must define `chosen` for it',
				'/holders.ts:3:18  scope({ b: "string" }) is left to arktype\n  direct.type(flag ? "b" : "b | null") (/main.ts:7:18) reads `direct` but isn\'t precompiled, so arktype must define `direct` for it'
			])
			attest(left.code).equals(files["/holders.ts"])
			precompiler = new Precompiler(memoryHost(files))
			precompiler.precompile(files["/holders.ts"], "/holders.ts")
			const failed = precompiler.precompile(files["/main.ts"], "/main.ts")
			// reported once per refused read, whichever stand-in it finds first
			attest(failed.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:6:18  chosen.type("a") reads `chosen`, which the build replaced with an object that lacks its members\n  `chosen` holds scope({ a: "string" }) (/holders.ts:2:23), a Scope precompiled before chosen.type("a") was refused\n  Put // @ark-runtime on the line before scope({ a: "string" }), so arktype defines it at runtime, or build with runtime: "arktype".',
				'/main.ts:6:18  chosen.type("a") can\'t be precompiled yet\n  `chosen` may be a Scope, which a standalone build replaces with an object that lacks `type`\n  Assign it to a const and read `type` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:7:18  direct.type(flag ? "b" : "b | null") cannot be precompiled\n  `flag` is declared without a value\n  Replace `flag` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.',
				'/main.ts:7:18  direct.type(flag ? "b" : "b | null") reads `direct`, which the build replaced with an object that lacks its members\n  `direct` is scope({ b: "string" }) (/holders.ts:3:18), a Scope precompiled before direct.type(flag ? "b" : "b | null") was refused\n  Put // @ark-runtime on the line before scope({ b: "string" }), so arktype defines it at runtime, or build with runtime: "arktype".'
			])
			// read off a namespace import, whose binding's value holds no export
			const namespaced = {
				"/holders.ts": `import { scope } from "arktype"
export const $ = scope({ a: "string" })
export const held = { s: scope({ a: "number" }) }
export default $`,
				"/main.ts": `import * as ns from "./holders.ts"
declare const flag: boolean
export const A = ns.default.type(flag ? "a" : "a | null")
export const B = ns.held.s.type(flag ? "a" : "a | null")`
			}
			precompiler = new Precompiler(memoryHost(namespaced))
			precompiler.precompile(namespaced["/main.ts"], "/main.ts")
			attest(
				precompiler
					.precompile(namespaced["/holders.ts"], "/holders.ts")
					.diagnostics.map(d => d.message)
			).snap([
				'scope({ a: "string" }) is left to arktype',
				'scope({ a: "number" }) is left to arktype'
			])
			// held by a const of the reader's own module
			const result = precompile(`import { scope } from "arktype"
declare const flag: boolean
const H = { $: scope({ a: "string" }) }
export const A = H.$.type("a | null")
export const B = H.$.type(flag ? "a" : "a | null")`)
			attest(result.sites.map(site => site.status)).equals([
				"rejected",
				"accepted",
				"rejected"
			])
			attest(foldedCode(result.code)).snap(`import { scope } from "arktype"
declare const flag: boolean
const H = { $: scope({ a: "string" }) }
export const A = $ark#0(H)
export const B = H.$.type(flag ? "a" : "a | null")`)
		})

		it("keeps a keyword's expression after walking a Generic's scope", () => {
			// the build walks an exported Generic for holes, reaching arktype's
			// scope; read through its aliases, a keyword module resolved each
			// keyword in its own scope, after which a definition referencing
			// `string.numeric.parse` printed an alias in place of its expression
			const [boxed, parsed] = inFreshProcess(
				async (generic: string, main: string) => {
					const { createNodeHost, Precompiler } = await import("@ark/aot")
					const { readFileSync } = await import("node:fs")
					const precompiler = new Precompiler(
						createNodeHost({ conditions: ["ark-ts"] })
					)
					precompiler.precompile(readFileSync(generic, "utf8"), generic)
					const { sites } = precompiler.precompile(
						readFileSync(main, "utf8"),
						main
					)
					return sites.map(
						site => (site.value as { expression: string }).expression
					)
				},
				[fromHere("walked", "generic.ts"), fromHere("walked", "main.ts")]
			)
			// what arktype prints in a process that never walked its scope
			const expected = inFreshProcess(async () => {
				const { type } = await import("arktype")
				return type(["string.numeric.parse", "[]"]).expression
			})
			attest(boxed).equals("{ box: string }")
			attest(parsed).equals(expected)
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
				'/main.ts:2:11  scope({ a: "string" }) is left to arktype\n  $.json (/main.ts:4:22) reads `$` but isn\'t precompiled, so arktype must define `$` for it',
				'/main.ts:3:11  type("<t>", { x: "t" }) is left to arktype\n  G.json (/main.ts:4:30) reads `G` but isn\'t precompiled, so arktype must define `G` for it',
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

		it("checks a helper arktype called for an earlier site", () => {
			const files = {
				"/checked.ts": `import { type } from "arktype"
import { isPositive } from "./positive.ts"
export const Positive = type(["0 | 1", ":", isPositive])
export const expression = type(["0 | 1", ":", isPositive]).expression`,
				"/positive.ts": "export const isPositive = (n: number) => n > 0"
			}
			// arktype reuses what it called isPositive for, so only the first
			// site's definition calls it
			const { code } = precompileModule(
				files["/checked.ts"],
				"/checked.ts",
				memoryHost(files),
				{ creationChecks: "helpers" }
			)
			attest(foldedCode(code)).snap(`import "arktype"
import { isPositive } from "./positive.ts"
export const Positive = $ark#0(isPositive, isPositive)
export const expression = $ark#2(isPositive, isPositive)`)
		})

		it("passes a module's member by the holes the site names", () => {
			const files = {
				"/positive.ts": "export const isPositive = (n: number) => n > 0"
			}
			const build = (source: string) => {
				const { code, diagnostics } = precompileModule(
					source,
					"/main.ts",
					memoryHost({ ...files, "/main.ts": source })
				)
				return [
					...diagnostics.map(d => renderDiagnostic(d).split("\n")[0]),
					foldedCode(code)
				]
			}
			const elements = `type.module({ a: ["number", ":", isPositive] }).a.array()`
			attest(
				build(`import { type } from "arktype"
import { isPositive } from "./positive.ts"
export const Elements = ${elements}`)
			).snap([
				'import "arktype"\nimport { isPositive } from "./positive.ts"\nexport const Elements = $ark#0(isPositive)'
			])
			// arktype has called isPositive, so the site can't pass it as a hole
			attest(
				build(`import { type } from "arktype"
import { isPositive } from "./positive.ts"
export const Positive = type(["0 | 1", ":", isPositive])
export const Elements = ${elements}`)
			).snap([
				'/main.ts:4:25  type.module({ a: ["number", ":", isPositive] }).a.array() can\'t be precompiled yet',
				'import { type } from "arktype"\nimport { isPositive } from "./positive.ts"\nexport const Positive = $ark#0(isPositive)\nexport const Elements = type.module({ a: ["number", ":", isPositive] }).a.array()'
			])
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

		it("reads holes through an object const", () => {
			const source = `import { type } from "arktype"
import { config } from "./config.ts"
import { fields } from "./fields.ts"
const isX = (v: string) => v !== "x"
const Password = type("string > 0").narrow(isX)
const local = { current: Password, confirm: Password }
const labels = { message: config.message }
export const Change = type(local)
export const Spread = type({ ...local, note: "string" })
export const Checked = type(local).narrow(isX as never)
export const Imported = type(fields).configure(config)
export const Labeled = type("string.uuid").configure({ ...labels, expected: "an id" })`
			const result = precompileModule(
				source,
				"/main.ts",
				memoryHost({
					"/main.ts": source,
					"/config.ts":
						"export const message = (ctx: { expected: string }) => `must ${ctx.expected}`\nexport const config = { message }",
					"/fields.ts":
						'import { type } from "arktype"\nexport const Name = type("string").narrow(s => s.length > 1)\nexport const fields = { name: Name }'
				})
			)
			attest(result.diagnostics).equals([])
			attest(foldedCode(result.code)).snap(`import "arktype"
import $arkfixConfig from "~arktype/#7"
import { config } from "./config.ts"
import { fields } from "./fields.ts"
const isX = (v: string) => v !== "x"
$arkfixConfig()
const Password = /* @__PURE__ */ $ark#0(isX)
const local = { current: Password, confirm: Password }
const labels = { message: config.message }
export const Change = $ark#2(local)
export const Spread = $ark#3(local)
export const Checked = $ark#4(isX as never, local)
export const Imported = $ark#5(fields, config)
export const Labeled = $ark#6(labels)`)
			// each factory checks the object it's passed, then reads its holes
			const artifact = Object.values(result.modules)
				.join("\n")
				.split("\n")
				.filter(line => line.startsWith("runtime.check"))
			attest(normalized(artifact)).snap([
				'runtime.checkFacts(runtime.describeShape(p0), "an object with keys current, confirm", "`local`")',
				'runtime.checkIdentity(holes2[0], holes1[0], "`local.confirm`\'s hole 0", "`local.current`\'s hole 0")',
				'runtime.checkFacts(runtime.describeShape(p0), "an object with keys current, confirm", "`local`")',
				'runtime.checkIdentity(holes2[0], holes1[0], "`local.confirm`\'s hole 0", "`local.current`\'s hole 0")',
				'runtime.checkFacts(runtime.describeShape(p1), "an object with keys current, confirm", "`local`")',
				'runtime.checkIdentity(holes1[0], p0, "`local.current`\'s hole 0", "`isX as never` (/main.ts:10:43)")',
				'runtime.checkIdentity(holes3[0], p0, "`local.confirm`\'s hole 0", "`isX as never` (/main.ts:10:43)")',
				'runtime.checkFacts(runtime.describeShape(p0), "an object with keys name", "`fields`")',
				'runtime.checkFacts(runtime.describeShape(p1), "an object with keys message", "`config`")',
				'runtime.checkFacts(runtime.factOfHole(p1["message"]), 1, "`config.message`")',
				'runtime.checkFacts(runtime.describeShape(p0), "an object with keys message", "`labels`")',
				'runtime.checkFacts(runtime.factOfHole(p0["message"]), 1, "`labels.message`")'
			])
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
