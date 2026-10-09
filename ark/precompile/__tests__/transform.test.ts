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
export const User = $arkvzvq2oze5lr
export const Same = $arkv22ro8s3uuz
export const Users = $arkv148ig5g1uwr
export const isError = (data: unknown) => data instanceof ArkErrors
import { vzvq2oze5lr as $arkvzvq2oze5lr } from "~arktype/niv4uq9j8l"
import { v22ro8s3uuz as $arkv22ro8s3uuz } from "~arktype/niv4uq9j8l"
import { v148ig5g1uwr as $arkv148ig5g1uwr } from "~arktype/niv4uq9j8l"`)
			attest(Object.keys(result.modules)).snap(["~arktype/niv4uq9j8l"])
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
export const A = $arkv2e1m8qabj8c
import { v2e1m8qabj8c as $arkv2e1m8qabj8c } from "~arktype/18scx4hvmp"`)
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
				"/main.ts:8:18  type(\"strin\") throws a ParseError\n  'strin' is unresolvable\n  The precompiled site throws the same ParseError when it is created.",
				'/main.ts:9:18  type({ "+": "delete", "[string]": "string", a: "\'a\'" }) can\'t be precompiled to a standalone validator yet\n  structure { [string]: string, a: "a", + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:11:18  scope({ a: "string" }) can\'t be precompiled to a standalone validator yet\n  its value is not a Type or Module\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { scope, type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
const field = (n: number) => type(\`string <= \${n}\`)
export const A = $arkfytsovucmcv(trim)
export const B = $arkf2bfm9voib1j(max)
export const C = $arkv2cw04mqw80s
export const D = $ark11nyj35o0sh()
export const E = type({ "+": "delete", "[string]": "string", a: "'a'" })
export const F = $arkvpatjbfbx3k
export const G = scope({ a: "string" })
import { fytsovucmcv as $arkfytsovucmcv } from "~arktype/3k9u25xc99"
import { f2bfm9voib1j as $arkf2bfm9voib1j } from "~arktype/3k9u25xc99"
import { v2cw04mqw80s as $arkv2cw04mqw80s } from "~arktype/3k9u25xc99"
import { vpatjbfbx3k as $arkvpatjbfbx3k } from "~arktype/3k9u25xc99"
import $ark11nyj35o0sh from "~arktype/11nyj35o0sh"`)
		})

		it("folds Modules", () => {
			const result = precompile(`import { scope, type } from "arktype"
export const types = scope({ tree: { value: "number", "children?": "tree[]" } }).export()
export const M = type.module({ a: "string", b: { c: "a" } })`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
export const types = $arkv2f0bhdcpikw
export const M = $arkv209i2jspcoq
import { v2f0bhdcpikw as $arkv2f0bhdcpikw } from "~arktype/lyrf7rme87"
import { v209i2jspcoq as $arkv209i2jspcoq } from "~arktype/lyrf7rme87"`)
			attest(
				Object.values(result.modules)[0]
					.split("\n")
					.filter(line => /^const module\d/.test(line))
			).snap([
				'const module0 = runtime.freeze({ ["tree"]: validator0 })',
				'const module1 = runtime.freeze({ ["a"]: validator1, ["b"]: validator2 })'
			])
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
export const Pair = type([Name, Either])
export const Short = Name.narrow(s => s.length < 9)
export const Stamped = type({ at: ["Date", "=", () => new Date()] })`
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
export const Name = $arkf1zfc4jvopxh(trim, (s, ctx) => s.length > 0)
export const User = $arkfujb2tq68ew(Name, Pet, petTag)
export const Either = $arkfyhi0i9lyrd(trim)
export const Extended = $arkf1u6d12e2tku(ext)
export const Pair = $arkf1wp1un5l57h(Name, Either)
export const Short = $arkf1qr3n92up8j(Name, s => s.length < 9)
export const Stamped = $arkfhcw8rg5ps0(() => new Date())
import { f1zfc4jvopxh as $arkf1zfc4jvopxh } from "~arktype/1nohe0brkcw"
import { fujb2tq68ew as $arkfujb2tq68ew } from "~arktype/1nohe0brkcw"
import { fyhi0i9lyrd as $arkfyhi0i9lyrd } from "~arktype/1nohe0brkcw"
import { f1u6d12e2tku as $arkf1u6d12e2tku } from "~arktype/1nohe0brkcw"
import { f1wp1un5l57h as $arkf1wp1un5l57h } from "~arktype/1nohe0brkcw"
import { f1qr3n92up8j as $arkf1qr3n92up8j } from "~arktype/1nohe0brkcw"
import { fhcw8rg5ps0 as $arkfhcw8rg5ps0 } from "~arktype/1nohe0brkcw"`)
		})

		it("passes the inputs a site reads after its holes", () => {
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
export const Defined = type(process.env.NODE_ENV === "production" ? "string" : "number")
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
				}),
				{ define: { "process.env.NODE_ENV": "production" } }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/inputs.ts:18:9  type(alias.name) can't be precompiled to a standalone validator yet\n  `o` (/inputs.ts:7:7) is shadowed where the site is written, so its factory can't receive it\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(result.code).snap(`import { type } from "arktype"
import { max } from "./limits.ts"
import { reboxed } from "./reboxed.ts"
import { shape } from "./shapes.ts"
import * as limits from "./limits.ts"
const trim = (s: string) => s.trim()
const o = { name: "string", tags: ["string"] }
const alias = o
export const Local = $arkf19cnbo9pame(trim, o)
export const Imported = $arkf1uslk6cbzgz(max, o)
export const Added = $arkf20bd0we3n85(reboxed)
export const Defined = $arkf12afweyjfd6(process.env.NODE_ENV)
export const Namespaced = $arkfzp95xqs0o7(limits.boxed)
const box = shape
export const Imports = ((shape: number) => $arkf1kdxkkysgwf($arki15vt9rj2an1, box))(1)
export const Shadowed = (() => {
	const o = 1
	return type(alias.name)
})()
import { shape as $arki15vt9rj2an1 } from "./shapes.ts"
import { f19cnbo9pame as $arkf19cnbo9pame } from "~arktype/3qz4c9i9sb"
import { f1uslk6cbzgz as $arkf1uslk6cbzgz } from "~arktype/3qz4c9i9sb"
import { f20bd0we3n85 as $arkf20bd0we3n85 } from "~arktype/3qz4c9i9sb"
import { f12afweyjfd6 as $arkf12afweyjfd6 } from "~arktype/3qz4c9i9sb"
import { fzp95xqs0o7 as $arkfzp95xqs0o7 } from "~arktype/3qz4c9i9sb"
import { f1kdxkkysgwf as $arkf1kdxkkysgwf } from "~arktype/3qz4c9i9sb"`)
		})

		it("prints the names in a ParseError when it is thrown", () => {
			const source = `import { type } from "arktype"
const isZero = (n: number) => n === 0
export const Narrowed = type("1").narrow(isZero)
export const Defaulted = type({ n: [type("number").narrow(isZero), "=", 3] })`
			const result = precompileModule(
				source,
				"/thrower.ts",
				memoryHost({ "/thrower.ts": source })
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/thrower.ts:3:25  type("1").narrow(isZero) throws a ParseError\n  Intersection of 1 and isZero results in an unsatisfiable type\n  The precompiled site throws the same ParseError when it is created.',
				'/thrower.ts:4:26  type({ n: [type("number").narrow(isZero), "=", 3] }) throws a ParseError\n  Default for n must be valid according to isZero (was 3)\n  The precompiled site throws the same ParseError when it is created.'
			])
			attest(result.code).snap(`import "arktype"
const isZero = (n: number) => n === 0
export const Narrowed = $ark1iic477a2i9(isZero)
export const Defaulted = $ark2d34z78syo(isZero)
import $ark1iic477a2i9 from "~arktype/1iic477a2i9"
import $ark2d34z78syo from "~arktype/2d34z78syo"`)
			attest(Object.values(result.modules)).snap([
				'import * as runtime from "arktype/runtime"\n\nconst throwParseError = (p0) => {\n\tthrow new runtime.ParseError("Intersection of 1 and " + runtime.functionNameOf(p0) + " results in an unsatisfiable type")\n}\n\nexport { throwParseError as default }\n',
				'import * as runtime from "arktype/runtime"\n\nconst throwParseError = (p0) => {\n\tthrow new runtime.ParseError("Default for n must be " + runtime.describePredicate({ predicate: p0 }) + " (was 3)")\n}\n\nexport { throwParseError as default }\n'
			])
		})

		it("checks the static helpers another module exports in a test driver", () => {
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
			const build = (id: keyof typeof files, checkHelpers: boolean) =>
				precompileModule(files[id], id, memoryHost(files), { checkHelpers })
			// a bundle runs the helpers the build read
			attest(build("/checked.ts", false).diagnostics).equals([])
			const checked = build("/checked.ts", true)
			attest(checked.diagnostics.map(renderDiagnostic)).snap([
				"/checked.ts:8:23  type(single(\"string\")) can't be precompiled to a standalone validator yet\n  `default` (/helpers.ts:5:16) is a static helper its module doesn't export through a binding, so a test driver can't register it\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(checked.code).snap(`import { type } from "arktype"
import single, { list } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const own = (def: string) => list(def)
export const List = $arkf3ztwe52hlc(list)
export const Own = $arkf20bdtc14r0x(list)
export const Optional = $arkfomeifcka3x(helpers.optional, $arki1hye78qyfa1)
export const Single = type(single("string"))
import { suffix as $arki1hye78qyfa1 } from "./suffix.ts"
import { f3ztwe52hlc as $arkf3ztwe52hlc } from "~arktype/173yau7674t"
import { f20bdtc14r0x as $arkf20bdtc14r0x } from "~arktype/173yau7674t"
import { fomeifcka3x as $arkfomeifcka3x } from "~arktype/173yau7674t"`)
			attest(build("/helpers.ts", true).code)
				.snap(`import { suffix } from "./suffix.ts"
const base = (def: string) => \`\${def}[]\`
export const list = (def: string) => base(def)
export const optional = (def: string) => suffix(def, " | undefined")
export default (def: string) => def
Object.assign((globalThis[Symbol.for("arktype.helpers")] ??= { __proto__: null }), { "/helpers.ts": { __proto__: null, "list": list, "optional": optional } })`)
		})

		it("unsupported sites", () => {
			const result = precompile(
				`import { type } from "arktype"
import { a } from "./a.ts"
import { b, alias } from "./b.ts"
export const Both = type("string").pipe(a, b)
export const Aliased = type("string").pipe(a).or(type("number").pipe(alias))`,
				{
					"/a.ts": "export const a = (s: string) => s",
					"/b.ts":
						'export const b = (s: string) => s\nexport { a as alias } from "./a.ts"'
				}
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:4:21  type("string").pipe(a, b) can\'t be precompiled to a standalone validator yet\n  `a` and `b` may hold the same value at runtime, which the site\'s output depends on\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:5:24  type("string").pipe(a).or(type("number").pipe(alias)) can\'t be precompiled to a standalone validator yet\n  `a` and `alias` may hold different values at runtime, which the site\'s output depends on\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
		})

		it("reports a Module whose site reads what only a factory receives", () => {
			const result = precompile(
				`import { type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
export const Held = type.module({ a: ["string", "=>", trim] })
export const Read = type.module({ a: \`string <= \${max}\` })`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:4:21  type.module({ a: ["string", "=>", trim] }) can\'t be precompiled to a standalone validator yet\n  arktype holds `trim` (/main.ts:4:55), which only a Type\'s factory can receive yet\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/main.ts:5:21  type.module({ a: `string <= ${max}` }) can't be precompiled to a standalone validator yet\n  `max` is imported from /limits.ts, which only a Type's factory can compare yet\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
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
				'const { "vk7v7o06cb9": $arkvk7v7o06cb9 } = ((runtime, Array) => {',
				"})($ark$0, globalThis.Array);",
				'const { "default": $ark29kiraik2u5 } = (({ "ParseError": ParseError }) => {',
				"const throwParseError = () => {",
				"\tthrow new ParseError(\"'strng' is unresolvable\")",
				"}",
				'return { "default": throwParseError }',
				"})($ark$0);",
				'import "arktype"',
				'const Array = "shadowed"',
				"export const T = $arkvk7v7o06cb9",
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

	it("keeps sites apart whose Types differ only in their scope's config", () => {
		const { modules } = precompile(`import { scope } from "arktype"
export const Custom = scope({}, { domain: { message: "custom" } }).type({ x: "string" })
export const Default = scope({}).type({ x: "string" })`)
		attest(Object.values(modules)[0].includes('message: "custom"')).equals(true)
	})

	it("writes the same modules in any order after unrelated work", () => {
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
			scope({
				After: "Date > d'2001-01-01T00:00:00.000Z'",
				tree: { "children?": "tree[]" }
			}).export()
			attest(build([unrelated, ...[...ids].reverse()], runtime)).equals(first)
		}
	})
})
