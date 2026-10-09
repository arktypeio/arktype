import { attest, contextualize } from "@ark/attest"
import {
	precompileModule,
	Precompiler,
	renderDiagnostic
} from "@ark/precompile"
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
export const User = $ark1169pgizw3q
export const Same = $ark1169pgizw3q
export const Users = $arku8qjlz7etl
export const isError = (data: unknown) => data instanceof ArkErrors
import { v1169pgizw3q as $ark1169pgizw3q } from "~arktype/1mraxz65kx7"
import { vu8qjlz7etl as $arku8qjlz7etl } from "~arktype/1mraxz65kx7"`)
			attest(Object.keys(result.modules)).snap(["~arktype/1mraxz65kx7"])
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
export const A = $arkek65jf4484
import { vek65jf4484 as $arkek65jf4484 } from "~arktype/1nor5fmhz08"`)
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
				'/main.ts:5:18  type("string").pipe(trim) can\'t be precompiled to a standalone validator yet\n  arktype holds `trim` (/main.ts:5:38)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
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
export const A = type("string").pipe(trim)
export const B = type(\`string <= \${max}\`)
export const C = field(5)
export const D = $ark11nyj35o0sh()
export const E = type({ "+": "delete", "[string]": "string", a: "'a'" })
export const F = $ark1bp5ims0ip5
export const G = scope({ a: "string" })
import $ark11nyj35o0sh from "~arktype/11nyj35o0sh"
import { v1bp5ims0ip5 as $ark1bp5ims0ip5 } from "~arktype/1fxgbfuxg0s"`)
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
				'const { "v10r4iwvwtfo": $ark10r4iwvwtfo } = ((runtime, Array) => {',
				"})($ark$0, globalThis.Array);",
				'const { "default": $ark29kiraik2u5 } = (({ "ParseError": ParseError }) => {',
				"const throwParseError = () => {",
				"\tthrow new ParseError(\"'strng' is unresolvable\")",
				"}",
				'return { "default": throwParseError }',
				"})($ark$0);",
				'import "arktype"',
				'const Array = "shadowed"',
				"export const T = $ark10r4iwvwtfo",
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
})
