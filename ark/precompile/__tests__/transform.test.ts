import { attest, contextualize } from "@ark/attest"
import { renderDiagnostic } from "@ark/precompile"
import { precompile } from "./utils.ts"

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
import { v1169pgizw3q as $ark1169pgizw3q } from "~arktype/v4quptxu16"
import { vu8qjlz7etl as $arku8qjlz7etl } from "~arktype/v4quptxu16"`)
			attest(Object.keys(result.modules)).snap(["~arktype/v4quptxu16"])
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
import { vek65jf4484 as $arkek65jf4484 } from "~arktype/2etphfepcb9"`)
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
import { v1bp5ims0ip5 as $ark1bp5ims0ip5 } from "~arktype/25f3oo6abmn"`)
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
})
