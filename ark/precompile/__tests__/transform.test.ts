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
import { memoryHost, precompile } from "./utils.ts"

contextualize(() => {
	describe("standalone", () => {
		it("folds sites to validators", () => {
			const result = precompile(`import { type, ArkErrors } from "arktype"
const max = 64
export const User = type({ name: \`string <= \${max}\` })
export const Same = type({ name: "string <= 64" })
export const Users = User.array()
export const isError = (data: unknown) => data instanceof ArkErrors`)
			attest(result.code).snap(`import { ArkErrors } from "arktype"
const max = 64
export const User = $arkv1169pgizw3q
export const Same = $arkv1169pgizw3q
export const Users = $arkvu8qjlz7etl
export const isError = (data: unknown) => data instanceof ArkErrors
import { v1169pgizw3q as $arkv1169pgizw3q } from "~arktype/1khoz0jbw1v"
import { vu8qjlz7etl as $arkvu8qjlz7etl } from "~arktype/1khoz0jbw1v"`)
			attest(Object.keys(result.modules)).snap(["~arktype/1khoz0jbw1v"])
			attest(result.map?.sources).equals(["/main.ts"])
		})

		it("loads arktype where it was imported", () => {
			attest(
				precompile(`import "./polyfill.ts"
import { type, scope as $ } from "arktype"
import * as config from "./config.ts"
export const A = type("string")`).code
			).snap(`import "./polyfill.ts"
import "arktype"
import * as config from "./config.ts"
export const A = $arkvek65jf4484
import { vek65jf4484 as $arkvek65jf4484 } from "~arktype/1mlwmfqh1db"`)
		})

		it("unsupported sites", () => {
			const result = precompile(
				`import { scope, type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
const field = (n: number) => type(\`string <= \${n}\`)
export const A = type("string").pipe(trim)
export const B = type(\`string <= \${max}\`)
export const C = field(5)
export const D = type("strin")
export const E = type({ "+": "delete", "[string]": "string", a: "'a'" })
export const F = type("number")
export const G = scope({ a: "string" })`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:6:18  type(`string <= ${max}`) can't be precompiled to a standalone validator yet\n  `max` is imported from /limits.ts\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				"/main.ts:7:18  field(5) can't be precompiled to a standalone validator yet\n  it calls the static helper `field` (/main.ts:4:15)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				"/main.ts:8:18  type(\"strin\") throws a ParseError\n  'strin' is unresolvable\n  The precompiled site throws the same ParseError when it is created.",
				'/main.ts:9:18  type({ "+": "delete", "[string]": "string", a: "\'a\'" }) can\'t be precompiled to a standalone validator yet\n  structure { [string]: string, a: "a", + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:11:18  scope({ a: "string" }) can\'t be precompiled to a standalone validator yet\n  its value is not a Type\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { scope, type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
const field = (n: number) => type(\`string <= \${n}\`)
export const A = $arkf2f7m2qez7rp(trim)
export const B = type(\`string <= \${max}\`)
export const C = field(5)
export const D = $ark11nyj35o0sh()
export const E = type({ "+": "delete", "[string]": "string", a: "'a'" })
export const F = $arkv1bp5ims0ip5
export const G = scope({ a: "string" })
import { f2f7m2qez7rp as $arkf2f7m2qez7rp } from "~arktype/22notqngc0z"
import { v1bp5ims0ip5 as $arkv1bp5ims0ip5 } from "~arktype/22notqngc0z"
import $ark11nyj35o0sh from "~arktype/11nyj35o0sh"`)
		})
	})

	describe("factories", () => {
		it("folds a site holding functions to a factory call passed them in place", () => {
			const source = `import { type } from "arktype"
import { ext } from "./ext.ts"
const trim = (s: string) => s.trim()
class Pet {}
const petTag = Symbol("petTag")
export const Name = type("string").pipe(trim).narrow((s, ctx) => s.length > 0)
export const User = type({ name: Name, pet: type.instanceOf(Pet), [petTag]: "string" })
export const Either = type("string").pipe(trim).or(type("number").pipe(trim))
export const Extended = type("string").pipe(ext)
export const Pair = type([Name, Either])`
			// a hole is registered by a name from its module and position, which no other test shares
			const result = precompileModule(
				source,
				"/factories.ts",
				memoryHost({
					"/factories.ts": source,
					"/ext.ts": "export const ext = (s: string) => s"
				})
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(result.code).snap(`import "arktype"
import { ext } from "./ext.ts"
const trim = (s: string) => s.trim()
class Pet {}
const petTag = Symbol("petTag")
export const Name = $arkfjn5p53yrnw(trim, (s, ctx) => s.length > 0)
export const User = $arkf17onxh5wa5v(Name, Pet, petTag)
export const Either = $arkf177zfl998m9(trim)
export const Extended = $arkf14b60szkb1e(ext)
export const Pair = $arkfcfvlzq3rdy(Name, Either)
import { fjn5p53yrnw as $arkfjn5p53yrnw } from "~arktype/1j2509sapfe"
import { f17onxh5wa5v as $arkf17onxh5wa5v } from "~arktype/1j2509sapfe"
import { f177zfl998m9 as $arkf177zfl998m9 } from "~arktype/1j2509sapfe"
import { f14b60szkb1e as $arkf14b60szkb1e } from "~arktype/1j2509sapfe"
import { fcfvlzq3rdy as $arkfcfvlzq3rdy } from "~arktype/1j2509sapfe"`)
		})

		it("unsupported sites", () => {
			const result = precompile(
				`import { type } from "arktype"
import { a } from "./a.ts"
import { b, alias } from "./b.ts"
export const Both = type("string").pipe(a, b)
export const Aliased = type("string").pipe(a).or(type("number").pipe(alias))
export const Defaulted = type({ a: ["string[]", "=", () => []] })`,
				{
					"/a.ts": "export const a = (s: string) => s",
					"/b.ts":
						'export const b = (s: string) => s\nexport { a as alias } from "./a.ts"'
				}
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:4:21  type("string").pipe(a, b) can\'t be precompiled to a standalone validator yet\n  `a` and `b` may hold the same value at runtime, which the site\'s output depends on\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:5:24  type("string").pipe(a).or(type("number").pipe(alias)) can\'t be precompiled to a standalone validator yet\n  `a` and `alias` may hold different values at runtime, which the site\'s output depends on\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:6:26  type({ a: ["string[]", "=", () => []] }) can\'t be precompiled to a standalone validator yet\n  arktype holds `() => []` (/main.ts:6:54) in a function of its own, which a standalone validator can\'t create yet\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
		})
	})

	describe("cache", () => {
		it("imports a table after the module's imports", () => {
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
			attest(result.code).snap(`import { type } from "arktype"
let def = "string"
def = "number"
export const Trimmed = type("string").pipe(s => s.trim())
export const T = type(def)
import { other } from "./other.ts"
import "~arktype/units/1japii3t7y8"`)
			attest(result.diagnostics.map(d => `${d.rule} ${d.severity}`)).snap([
				"R1 warning"
			])
			attest(result.modules["~arktype/units/1japii3t7y8"].split("\n")[0]).snap(
				'import { registerPrecompiledUnits } from "arktype/internal"'
			)
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
			attest(result.code).satisfies(/export const User = \$ark\w+\n/)
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
		it("runs each module in a function passed the globals its importer shadows", () => {
			const result = precompile(
				`import { type } from "arktype"
const Array = "shadowed"
export const T = type("string[]")
export const E = type("strng")`,
				{},
				{ inline: true }
			)
			const lines = result.code.split("\n")
			attest([lines[0], ...lines.slice(-12)]).snap([
				'const { "v10r4iwvwtfo": $arkv10r4iwvwtfo } = ((runtime, Array) => {',
				"})($ark$0, globalThis.Array);",
				'const { "default": $ark29kiraik2u5 } = (({ "ParseError": ParseError }) => {',
				"const throwParseError = () => {",
				"\tthrow new ParseError(\"'strng' is unresolvable\")",
				"}",
				'return { "default": throwParseError }',
				"})($ark$0);",
				'import "arktype"',
				'const Array = "shadowed"',
				"export const T = $arkv10r4iwvwtfo",
				"export const E = $ark29kiraik2u5()",
				'import * as $ark$0 from "arktype/runtime"'
			])
			attest(result.modules).equals({})
		})

		it("registers the keyword table before arktype loads", () => {
			const lines = precompile(
				`import "./config.ts"
import { type } from "arktype"
export const T = type("string[]")`,
				{},
				{ inline: true, runtime: "arktype" }
			).code.split("\n")
			attest([lines[0], ...lines.slice(-6)]).snap([
				';(({ "registerPrecompiledUnits": registerPrecompiledUnits }) => {',
				"})($ark$0);",
				'import "./config.ts"',
				'import "arktype/internal/precompiled.js"',
				'import { type } from "arktype"',
				'export const T = type("string[]")',
				'import * as $ark$0 from "arktype/internal"'
			])
		})
	})

	it("reads which modules may define a Type from their imports", () => {
		const files = {
			"/ark.ts": 'export { type } from "arktype"',
			"/schemas.ts":
				'import { type } from "./ark.ts"\nexport const User = type({ name: "string" })',
			"/helpers.ts":
				'import { type } from "arktype"\nexport const field = (n: number) => type(`string <= ${n}`)',
			"/all.ts": 'export * from "./schemas.ts"',
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
			"/errors.ts false",
			"/check.ts false",
			"/math.ts false"
		])
	})

	it("writes the same modules in any order after unrelated work", () => {
		const ids = ["main.ts", "dates.ts", "numbers.ts", "local.ts"].map(file =>
			fromHere("environments", file)
		)
		const unrelated = fromHere("app", "schemas.ts")
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
			for (let i = 0; i < 40; i++) type({ [`k${i}`]: `number > ${i}` })
			scope({ After: "Date > d'2001-01-01T00:00:00.000Z'" }).export()
			attest(build([unrelated, ...[...ids].reverse()], runtime)).equals(first)
		}
	})
})
