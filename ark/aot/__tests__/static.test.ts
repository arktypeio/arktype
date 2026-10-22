import { attest, contextualize } from "@ark/attest"
import {
	precompileModule,
	Precompiler,
	renderDiagnostic,
	type PrecompileOptions
} from "@ark/aot"
import {
	standardJsonSchemaWithoutStandardMessage,
	writeArktypeRuntimeOptionMessage
} from "@ark/aot/internal/settings.ts"
import { analyze, diagnosticsOf, memoryHost, statusesOf } from "./utils.ts"

// a diagnostic without its hint, where the reason is the behavior
const unhinted = (...args: Parameters<typeof diagnosticsOf>) =>
	diagnosticsOf(...args).map(d => d.slice(0, d.lastIndexOf("\n")))

contextualize(() => {
	describe("allowed", () => {
		it("literals and templates", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const max = 5
const A = type("string")
const B = type(\`number < \${max}\`)
const C = type(\`number < \${0.1 + 0.2}\`)
const D = type({ a: "number" } as const satisfies object)
const E = type(<const>["string", "number"])`)
			).snap([
				"3:11 accepted string",
				"4:11 accepted number < 5",
				"5:11 accepted number < 0.30000000000000004",
				"6:11 accepted { a: number }",
				"7:11 accepted [string, number]"
			])
		})

		it("object and array literals", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const key = "b"
const base = { a: "string" }
const rest = ["number"] as const
const A = type({ ...base, [key]: "number", [\`\${key}2\`]: "boolean" })
const B = type(["string", ...rest])`)
			).snap([
				"5:11 accepted { a: string, b: number, b2: boolean }",
				"6:11 accepted [string, number]"
			])
		})

		it("let never assigned", () => {
			attest(
				statusesOf(`import { type } from "arktype"
let max = 5
var min = 1
const A = type(\`\${min} < number < \${max}\`)`)
			).snap(["4:11 accepted 1 < number < 5"])
		})

		it("reads after a declaration", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const later = () => type(x)
var x = "string"
export const A = later()
export function make() {
	return type(y)
}
const y = "number"`)
			).snap(["2:21 accepted string", "6:9 accepted number"])
		})

		it("imports, re-exports and namespaces", () => {
			const result = analyze(
				`import { type } from "arktype"
import { max } from "./limits.ts"
import * as limits from "./all.ts"
import { min as low } from "./all.ts"
const A = type(\`\${low} < number < \${max + limits.max}\`)`,
				{
					"/limits.ts": `export const max = 5\nexport const min = 1`,
					"/reexport.ts": `export { max, min } from "./limits.ts"`,
					"/all.ts": `export * from "./reexport.ts"`
				}
			)
			attest(result.sites.map(site => site.status)).snap(["accepted"])
			attest(result.sites[0].inputs).snap([
				{ kind: "import", file: "/limits.ts", name: "min", path: [], value: 1 },
				{ kind: "import", file: "/limits.ts", name: "max", path: [], value: 5 }
			])
			attest(result.dependencies).snap([
				"/main.ts",
				"/all.ts",
				"/limits.ts",
				"/reexport.ts"
			])
		})

		it("star exports of arktype and packages", () => {
			attest(
				statusesOf(
					`import { type, z } from "./lib.ts"
const A = type({ a: "string" })
const B = type({ b: z.string() })`,
					{ "/lib.ts": `export * from "arktype"\nexport * from "zod"` }
				)
			).snap([
				"2:11 accepted { a: string }",
				"3:11 accepted { b: (In: unknown) => Out<unknown> }"
			])
		})

		it("packages that opt in", () => {
			const libraryFiles = (manifest: object) => ({
				"/node_modules/lib/package.json": JSON.stringify(manifest),
				"/node_modules/lib/index.js": `import { type } from "arktype"
export const User = type({ name: "string" })`
			})
			const source = `import { User } from "lib"
export const Admin = User.and({ role: "'admin'" })`
			const optedIn = libraryFiles({
				name: "lib",
				arktype: { precompile: true }
			})
			const plain = libraryFiles({ name: "lib" })
			attest(statusesOf(source, optedIn)).snap([
				'2:22 accepted { name: string, role: "admin" }'
			])
			attest(statusesOf(source, plain)).snap([])
			attest(
				[optedIn, plain].map(files =>
					new Precompiler(memoryHost(files)).readDependency(
						"/node_modules/lib/index.js"
					)
				)
			).snap([
				{ errors: [], warnings: [] },
				{
					errors: [
						'lib imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws. Have it publish its source with "arktype": { "precompile": true } in its package.json, so this build precompiles it. Set allowUnsafe: true to build anyway, with a warning.'
					],
					warnings: []
				}
			])
		})

		it("enums", () => {
			attest(
				statusesOf(`import { type } from "arktype"
enum Size { small = 1, large = small * 10 }
const enum Name { a = "alpha" }
const A = type(\`\${Size.small} < number < \${Size.large}\`)
const B = type(\`'\${Name.a}' | '\${Size[1]}'\`)`)
			).snap([
				"4:11 accepted 1 < number < 10",
				'5:11 accepted "alpha" | "small"'
			])
		})

		it("namespace interfaces", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
declare namespace ns {
	interface base {}
}
interface extended extends ns.base {}
const A = type("string")`)
			).equals([])
		})

		it("operators", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const max = 5
const A = type(\`number < \${max > 3 ? 2 ** 10 : -1}\`)
const B = type(\`'\${typeof max}' | '\${"a" in { a: 1 }}' | '\${null ?? max}'\`)`)
			).snap([
				"3:11 accepted number < 1024",
				'4:11 accepted "5" | "number" | "true"'
			])
		})

		it("member reads", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const limits = { max: 5, names: ["a", "b"] }
const A = type(\`number < \${limits.max + limits.names.length + "abc".length}\`)
const B = type(\`'\${limits.names[1]}'\`)`)
			).snap(["3:11 accepted number < 10", '4:11 accepted "b"'])
		})

		it("optional chains", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const o: { a?: { b: string }; f?: () => string } = {}
const A = type(o?.a?.b ?? "string")
const B = type(o.f?.() ?? "number")`)
			).snap(["3:11 accepted string", "4:11 accepted number"])
		})

		it("pure built-ins", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const roles = { admin: 1, member: 2 }
const A = type(Object.keys(roles).map(k => \`'\${k}'\`).join(" | "))
const B = type(\`number < \${Math.max(1, Number("2"), parseInt("3"))}\`)
const C = type(JSON.parse(JSON.stringify({ a: "string" })))
const D = type("string".toUpperCase().toLowerCase())`)
			).snap([
				'3:11 accepted "admin" | "member"',
				"4:11 accepted number < 3",
				"5:11 accepted { a: string }",
				"6:11 accepted string"
			])
		})

		it("arktype's API", () => {
			attest(
				statusesOf(`import { type, scope, match, generic } from "arktype"
import { regex } from "arkregex"
const User = type({ name: "string" })
const A = User.or("null").array()
const $ = scope({ id: "string", user: { id: "id" } }).export()
const M = match({ string: s => s.length, default: "assert" })
const Box = generic("t")({ box: "t" })
const B = Box("number")
const C = type("string").matching(regex("^a"))
const D = type.keywords.number.integer`)
			).snap([
				"3:14 accepted { name: string }",
				"4:11 accepted ({ name: string } | null)[]",
				"5:11 accepted",
				"6:11 accepted (In: string) => Out<unknown>",
				"7:13 accepted",
				"8:11 accepted { box: number }",
				"9:11 accepted /^a/",
				"10:11 accepted number % 1"
			])
		})

		it("static helpers", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { twice } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const bound = (n: number) => \`number < \${n}\`
const A = type(bound(twice(2)))
const B = type(helpers.label("a"))`,
					{
						"/helpers.ts": `export const twice = (n: number) => n * 2\nexport const label = (s: string) => \`'\${s}'\``
					}
				)
			).snap(["5:11 accepted number < 4", '6:11 accepted "a"'])
		})

		it("helpers with a TypeScript `this` parameter", () => {
			attest(
				statusesOf(`import { type, scope } from "arktype"
function h(this: void, def: string) { return def }
const A = type(h("string"))
const $ = scope({ a: function (this: void) { return "string" } as any }).export()`)
			).snap(["3:11 accepted string", "4:11 accepted"])
		})

		it("sites in static helpers", () => {
			const source = `import { type } from "arktype"
import { parseNames } from "./names.ts"
const Row = type({ id: "string" })
const createQuery = (options: { type: unknown; run: () => unknown }) => {
	const run = async () => options.run()
	return { run, type: options.type }
}
const rowsQuery = (id: string) => createQuery({ type: Row.array(), run: () => id })
export const load = async (id: string) => rowsQuery(id).run()
export const viaHelper = rowsQuery("x")
const rowQuery = (id: string) => createQuery({ type: Row, run: () => id })
export const loadOne = async (id: string) => rowQuery(id).run()
export const parseRows = (data: unknown) => Row.array()(data)
export const handle = (input: unknown) => parseNames(input)`
			const files = {
				"/names.ts": `import { type } from "arktype"
export const parseNames = (data: unknown) => type("string[]")(data)`
			}
			attest(statusesOf(source, files)).snap([
				"3:13 accepted { id: string }",
				"8:55 accepted { id: string }[]",
				"13:45 accepted { id: string }[]"
			])
			attest(diagnosticsOf(source, files)).snap([])
		})

		it("helpers over types", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const log = (t: unknown) => console.log(t)
log(type("number"))
const B = type("string")("data")`)
			).snap(["3:5 accepted number", "4:11 accepted string"])
		})

		it("members validators have", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type({ a: "string" })
const check = () => A.allows
const M = A.meta
const valid = check()(1) || A.assert("a")`)
			).snap(["2:11 accepted { a: string }"])
		})

		it("members validators lack", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const T = type({ a: "string.trim" })
const I = T.in
const label = () => T.out.expression`)
			).snap([
				"2:11 accepted { a: (In: string) => Out</^\\S[\\S\\s]*\\S$|^\\S?$/> }",
				"3:11 accepted { a: string }",
				"4:21 accepted"
			])
		})

		it("namespaces, literals and default exports", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import * as schemas from "./schemas.ts"
import Default from "./default.ts"
const local = { User: type({ name: "string" }) }
const A = schemas.User.or("null")
const B = local.User.or("null")
const C = Default.or("null")`,
					{
						"/schemas.ts": `import { type } from "arktype"\nexport const User = type({ id: "string" })`,
						"/default.ts": `import { type } from "arktype"\nexport default type({ d: "string" })`
					}
				)
			).snap([
				"4:23 accepted { name: string }",
				"5:11 accepted { id: string } | null",
				"6:11 accepted { name: string } | null",
				"7:11 accepted { d: string } | null"
			])
		})

		it("Types held in literals", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { schemas } from "./schemas.ts"
const local = { users: { User: type({ name: "string" }) }, list: [type("string")] }
const key = "users"
const A = schemas.User.or("null")
const B = local[key].User.or("null")
const C = local.list[0].array()`,
					{
						"/schemas.ts": `import { type } from "arktype"\nconst User = type({ id: "string" })\nexport const schemas = { User }`
					}
				)
			).snap([
				"3:32 accepted { name: string }",
				"3:67 accepted string",
				"5:11 accepted { id: string } | null",
				"6:11 accepted { name: string } | null",
				"7:11 accepted string[]"
			])
		})

		it("destructured Types", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { schemas } from "./schemas.ts"
const local = { users: { User: type({ name: "string" }) }, list: [type("string"), type("number")] }
const { User, Post: Renamed } = schemas
const { users: { User: Nested }, list: [S, ...rest] } = local
const { Missing = type("boolean") } = schemas as typeof schemas & { Missing?: unknown }
const A = User.or("null")
const B = Renamed.array()
const C = Nested.or("null")
const D = S.or(rest[0])
const E = Missing.or("null")
const { users, list } = local
const F = users.User.or(list[1])`,
					{
						"/schemas.ts": `import { type } from "arktype"\nexport const schemas = { User: type({ id: "string" }), Post: type({ title: "string" }) }`
					}
				)
			).snap([
				"3:32 accepted { name: string }",
				"3:67 accepted string",
				"3:83 accepted number",
				"6:19 accepted boolean",
				"7:11 accepted { id: string } | null",
				"8:11 accepted { title: string }[]",
				"9:11 accepted { name: string } | null",
				"10:11 accepted number | string",
				"11:11 accepted false | null | true",
				"13:11 accepted number | { name: string }"
			])
		})

		it("a Type destructured off a namespace import", () => {
			attest(
				statusesOf(
					`import * as S from "./schemas.ts"
const { User: U } = S
export const A = U.or("null")`,
					{
						"/schemas.ts": `import { type } from "arktype"\nexport const User = type({ id: "string" })`
					}
				)
			).snap(["3:18 accepted { id: string } | null"])
		})

		it("introspection members read off data the build has no source for", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
export const read = async (res: any, sym: any) => [
	await res.json(),
	sym.description,
	JSON.stringify(res),
	\`\${sym}\`
]
export const User = type({ name: "string" })`)
			).equals([])
		})

		it("data validated by a Module's Type", () => {
			attest(
				diagnosticsOf(`import { scope, type } from "arktype"
const shop = scope({ Id: "string", Cart: { owner: "Id", items: "string[]" } }).export()
const { Cart } = shop
export const upper = (data: unknown) =>
	shop.Cart.assert(data).items.map(i => i.toUpperCase())
export const messages = (data: unknown) => {
	const out = Cart(data)
	return out instanceof type.errors ? out.issues.map(i => i.message) : out.items.filter(Boolean)
}`)
			).equals([])
		})

		it("data validated by a submodule's Type", () => {
			attest(
				diagnosticsOf(`import { scope, type } from "arktype"
const nested = type.module({ Line: { sku: "string" } })
const shop = scope({ nested, "Box<t>": { of: "t" } }).export()
export const skus = (data: unknown[]) =>
	shop.nested.Line.array().assert(data).map(line => line.sku)`)
			).equals([])
		})

		it("data validated by an imported Module's Type", () => {
			const files = {
				"/shop.ts": `import { scope, type } from "arktype"
const $ = scope({
	Id: "string",
	Cart: { owner: "Id", items: "string[]" },
	sub: type.module({ Line: { sku: "string" } }),
	"Box<t>": { of: "t[]" }
})
export const shop = $.export()
export const direct = scope({ Cart: { items: "string[]" } }).export()
export { shop as renamed }`,
				"/reexported.ts": `export { direct as again } from "./shop.ts"`
			}
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import { direct, renamed, shop } from "./shop.ts"
import * as all from "./shop.ts"
import { again } from "./reexported.ts"
export const called = (data: unknown) => {
	const out = shop.Cart(data)
	return out instanceof type.errors ? [] : out.items.map(i => i)
}
export const asserted = (data: unknown) => direct.Cart.assert(data).items.map(i => i)
export const viaRename = (data: unknown) => renamed.Cart.assert(data).items.map(i => i)
export const viaNamespace = (data: unknown) => all.shop.Cart.assert(data).items.map(i => i)
export const viaReexport = (data: unknown) => again.Cart.assert(data).items.map(i => i)
export const nested = (data: unknown) => shop.sub.Line.assert(data).sku.split("")
export const boxed = (data: unknown) => shop.Box("string").assert(data).of.map(i => i)`,
					files
				)
			).equals([])
		})

		it("a Module's Generic called at runtime", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
const shop = scope({ "Box<t>": { of: "t" } }).export()
export const box = (t: string) => shop.Box(t).array()`)
			).snap([
				"/main.ts:3:44  `t` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `t` is a parameter of box (/main.ts:3:21); its value is known only at runtime\n  A Standard Schema other than a Type, like a Zod schema, needs no change. If it's a Type, make it static so the build precompiles it with the site."
			])
		})

		it("a Type destructured in a for-of", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const User = type({ name: "string" })
const cases = [["u", User]] as const
export const check = (data: unknown) => {
	for (const [, t] of cases) {
		const out = t(data)
		if (out instanceof type.errors) return out.issues.map(i => i.message)
	}
}`)
			).equals([])
		})

		it("a Type passed to an opaque helper", () => {
			attest(
				statusesOf(`import { scope, type } from "arktype"
const $ = scope({ a: "string" }).export()
function print(x: unknown) {
	console.log(x)
	return ""
}
const issuesOf = (T: any) => T({}).issues
const describe = (T: any) => print(issuesOf(T))
describe(type("number"))
describe($.a)`)
			).snap(["2:11 accepted", "9:10 accepted number"])
		})

		it("Types passed to one opaque call", () => {
			attest(
				statusesOf(`import { type } from "arktype"
import { router } from "some-router"
const route = (input: unknown, output: unknown) => router.register(input, output)
export const getUser = route(type({ id: "string" }), type({ name: "string" }))`)
			).snap(["4:30 accepted { id: string }", "4:54 accepted { name: string }"])
		})

		it("validations are not sites", () => {
			attest(
				statusesOf(`import { type, scope, fn } from "arktype"
const User = type({ name: "string" })
const types = scope({ id: "string" }).export()
const len = fn("string", ":", "number")(s => s.length)
const out = User({ name: "Alan" })
const text = out.toString()
const id = types.id("x").toString()
const name = User.assert({ name: "Ada" }).name
const assert = User.assert
const checked = assert({ name: "Grace" })
const length = len("abc")
const named = (data: unknown) => User.assert(data)
const ada = named({ name: "Ada" })`)
			).snap([
				"2:14 accepted { name: string }",
				"3:15 accepted",
				"4:13 accepted"
			])
		})

		it("runtime uses of arktype are not sites", () => {
			attest(
				statusesOf(
					`import { type, regex } from "arktype"
import { createClient } from "./client.ts"
const User = type({ name: "string" })
export function isValidationError(x: unknown) {
	return x instanceof type.errors
}
export const parseUser = (data: unknown) => {
	const out = User(data)
	if (isValidationError(out)) throw new Error(out.summary)
	return out
}
export const npmSpecifier = regex("^npm:(?<name>[a-z]+)$")
export function nameOf(specifier: string) {
	let match = npmSpecifier.exec(specifier)
	return match?.groups?.name
}
export const handler = (token: string) => {
	const client = createClient(token)
	return client.fetch()
}
export const problemsOf = (data: unknown) => {
	const out = User(data)
	if (!(out instanceof type.errors)) return
	return out.issues.map(issue => issue.message)
}`,
					{
						"/env.ts": `import { type } from "arktype"
export const env = type({ API_URL: "string" }).assert(process.env)`,
						"/client.ts": `import { connect } from "some-client-package"
import { env } from "./env.ts"
export const createClient = (token: string) => connect({ url: env.API_URL, token })`
					}
				)
			).snap(["3:14 accepted { name: string }", "12:29 accepted"])
		})

		it("objects and modules arktype returns", () => {
			attest(
				statusesOf(`import { type, scope, declare } from "arktype"
const A = declare<{ a: string }>().type({ a: "string" })
const $ = scope({ id: "string" })
const B = scope({ ...$.export(), user: { id: "id" } }).export()`)
			).snap(["2:11 accepted { a: string }", "3:11 accepted", "4:11 accepted"])
		})

		it("objects are inputs", () => {
			const result = analyze(`import { type } from "arktype"
const unit = { a: 1 }
const A = type("===", unit)`)
			attest(result.sites.map(site => site.status)).snap(["accepted"])
			attest(result.sites[0].inputs).snap([
				{
					kind: "local",
					file: undefined,
					name: "unit",
					path: [],
					value: { a: 1 }
				}
			])
		})

		it("nested definitions", () => {
			const result = analyze(
				`import { type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
const A = type({ name: type("string").atMostLength(max).pipe(trim) })`,
				{ "/limits.ts": `export const max = 5` }
			)
			attest(
				result.sites.map(site => [
					site.status,
					...site.holes.map(hole => hole.kind),
					...site.inputs.map(input => `${input.kind} ${input.name}`)
				])
			).snap([["accepted", "function", "import max"]])
		})

		it("dates", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type("Date").atOrAfter(new Date(0))`)
			).snap(["2:11 accepted Date >= d'1970-01-01T00:00:00.000Z'"])
		})

		it("regexes and symbols", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const tag = Symbol("tag")
const A = type("string").matching(new RegExp("^a", "i"))
const B = type({ [tag]: "string" })`)
			).snap(["3:11 accepted /^a/i", "4:11 accepted { Symbol(tag): string }"])
		})

		it("introspection sites", () => {
			const source = `import { type } from "arktype"
import { User } from "./user.ts"
const T = type({ a: "string" })
const a = T.json
const b = T.toJSON()
const c = T.toJsonSchema({ target: "draft-07" })
const d = T.expression
const e = () => T.description
const f = User.json`
			const files = {
				"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
			}
			attest(statusesOf(source, files)).snap([
				"3:11 accepted { a: string }",
				"4:11 accepted",
				"5:11 accepted",
				"6:11 accepted",
				"7:11 accepted",
				"8:17 accepted",
				"9:11 accepted"
			])
			// arktype computes it at runtime from the Type a site created
			attest(statusesOf(source, files, { runtime: "arktype" })).snap([
				"3:11 accepted { a: string }"
			])
		})

		it("arktype's types as annotations", () => {
			attest(
				statusesOf(`import { scope, type Scope } from "arktype"
export const $: Scope = scope({ a: "string" })
export const A = $.type("a[]")`)
			).snap(["2:25 accepted", "3:18 accepted string[]"])
		})
	})

	describe("rejected", () => {
		it("parameter", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"

const makeField = (limit: number) => {
	const field = type(\`string <= \${limit}\`)
	return field
}

const makeShortField = (limit: number) => type(\`string <= \${limit}\`)
const Short = makeShortField(5)
export const fields = [1, 2].map(makeShortField)`)
			).snap([
				'/main.ts:4:16  type(`string <= ${limit}`) cannot be precompiled\n  `limit` is a parameter of makeField (/main.ts:3:20); its value is known only at runtime\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
				'/main.ts:8:43  type(`string <= ${limit}`) cannot be precompiled\n  `limit` is a parameter of makeShortField (/main.ts:8:25); its value is known only at runtime\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
			])
		})

		it("a Scope a parameter configures", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"

const make = (jitless: boolean) => {
	const T = scope({}, { jitless }).type("string")
	return T
}`)
			).snap([
				'/main.ts:4:12  scope({}, { jitless }).type("string") cannot be precompiled\n  arktype holds `jitless` as a value rather than a definition, so it must be static\n  `jitless` is a parameter of make (/main.ts:3:15); its value is known only at runtime\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
			])
		})

		it("call the build cannot see into", () => {
			attest(
				statusesOf(`import { type } from "arktype"
import { max } from "lodash"
const load = () => {
	const def = 5
	return def
}
const A = type(\`number < \${load()}\`)
const B = type(\`number < \${max([1, 2])}\`)`)
			).snap([
				"7:11 rejected\n  `load()` calls a function the build does not interpret\n  `load` (/main.ts:3:14) is not a static helper: its body is not one expression or one `return`",
				"8:11 rejected\n  `lodash` is a package the build does not read"
			])
		})

		it("opaque definitions are Standard Schemas", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
import { z } from "zod"
const wrap = (schema: unknown) => {
	const Wrapped = type({ value: schema })
	return Wrapped
}
const A = type({ name: z.string() })`)
			).snap([
				"/main.ts:4:32  `schema` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `schema` is a parameter of wrap (/main.ts:3:15); its value is known only at runtime\n  A Standard Schema other than a Type, like a Zod schema, needs no change. If it's a Type, make it static so the build precompiles it with the site.",
				"/main.ts:7:24  `z.string()` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `zod` is a package the build does not read\n  A Standard Schema other than a Type, like a Zod schema, needs no change. If it's a Type, make it static so the build precompiles it with the site."
			])
		})

		it("keys that override an opaque value", () => {
			attest(
				statusesOf(`import { type } from "arktype"
import { z } from "zod"
const base = { a: z.string(), b: "string" }
const A = type({ ...base, a: "number" })
const B = type({ ...{ a: z.string() }, a: "number" })`)
			).snap([
				"4:11 accepted { a: number, b: string }",
				'5:11 rejected\n  `a: "number"` overwrites a value the build does not know\n  `zod` is a package the build does not read'
			])
		})

		it("structure of an opaque value", () => {
			attest(
				statusesOf(`import { type } from "arktype"
import { dbEnv } from "db"
const env = type({ API_URL: "string", PORT: "string" }).and(dbEnv)
const devEnv = type.and(env.omit("PORT"), env.pick("PORT").partial())
const input = env.in.omit("PORT")`)
			).snap([
				"3:13 accepted (In: { API_URL: string, PORT: string }) => Out<unknown>",
				'4:16 rejected\n  `env.omit("PORT")` reads the structure of `dbEnv`, which is not static\n  `db` is a package the build does not read',
				"5:15 accepted { API_URL: string }"
			])
		})

		it("values the build cannot read", () => {
			attest(
				statusesOf(`import { type } from "arktype"
import { Missing } from "./missing.ts"
import { External } from "pkg"
class UserDto {
	static schema = type({ name: "string" })
}
const A = type({ a: Missing })
const B = type({ b: Schema })
const C = type({ c: UserDto.schema })
const D = type({ d: this })
const E = type({ e: External })`)
			).snap([
				"5:18 accepted { name: string }",
				"7:11 rejected\n  `Missing` is an import the build cannot follow\n  /missing.ts cannot be read",
				"8:11 rejected\n  `Schema` is a global the build does not read",
				"9:11 rejected\n  `UserDto.schema` reads a property of a function the build does not interpret",
				"10:11 rejected\n  `this` is not in the static subset",
				"11:11 accepted { e: (In: unknown) => Out<unknown> }"
			])
		})

		it("imports assigned in their module", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { x, set } from "./a.ts"
import * as a from "./a.ts"
set()
const A = type(x)
const B = type(a.x)`,
					{
						"/a.ts": `export let x = "string"
export const set = () => { x = "number" }`
					}
				)
			).snap([
				"5:11 rejected\n  `x` is imported from /a.ts\n  `x` is assigned at /a.ts:2:28, so its value at the site is not known",
				"6:11 rejected\n  `x` is assigned at /a.ts:2:28, so its value at the site is not known"
			])
		})

		it("mutable binding", () => {
			attest(
				statusesOf(`import { type } from "arktype"
let max = 5
max++
const A = type(\`number < \${max}\`)`)
			).snap([
				"4:11 rejected\n  `max` is assigned at /main.ts:3:1, so its value at the site is not known"
			])
		})

		it("objects written before the site", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { shared } from "./shared.ts"
const fields = ["a", "b"]
const shape: Record<string, string> = {}
for (const f of fields) shape[f] = "string"
const keys = ["a"]
keys.push("b")
const nested = { inner: { x: "string" } }
const write = (o: { x: string }) => {
	o.x = "number"
}
write(nested.inner)
const later = { x: "string" }
export const A = type(shape)
export const B = type({ [keys[1]]: "string" })
export const C = type(nested)
export const D = type(shared)
export const E = type(later)
later.x = "number"
const called = { x: "string" }
const make = () => type(called)
called.x = "number"
export const F = make()`,
					{
						"/shared.ts": `export const shared: Record<string, string> = { a: "string" }
export const addB = () => {
	shared.b = "number"
}`
					}
				)
			).snap([
				"14:18 rejected\n  `shape` is written at /main.ts:5:25, so its value at the site is not known",
				"15:18 rejected\n  `keys` is written at /main.ts:7:1, so its value at the site is not known",
				"16:18 rejected\n  `nested` is written at /main.ts:12:1, so its value at the site is not known",
				"17:18 rejected\n  `shared` is imported from /shared.ts\n  `shared` is written at /shared.ts:3:2, so its value at the site is not known",
				"18:18 accepted { x: string }",
				"21:20 rejected\n  `called` is written at /main.ts:22:1, so its value at the site is not known"
			])
		})

		it("binding assigned in a branch", () => {
			attest(
				statusesOf(`import { type } from "arktype"
export const lengthOf = (c: { n?: number }) => {
	let max: number | undefined
	if (c.n) max = c.n
	return max ? type.string.atMostLength(max) : type.string
}`)
			).snap([
				"5:15 rejected\n  `max` is assigned at /main.ts:4:11, so its value at the site is not known",
				"5:47 accepted string"
			])
		})

		it("names declared more than once", () => {
			attest(
				statusesOf(`import { type } from "arktype"
export const make = () => {
	function def() { return "string" }
	function def() { return "number" }
	return type(def())
}
enum E { A = "string" }
enum E { B = "number" }
namespace N { export const a = "string" }
namespace N { export const b = "number" }
export const A = type((E as any).B ?? "boolean")
export const B = type((N as any).b ?? "boolean")`)
			).snap([
				"5:9 rejected\n  `def` is declared again at /main.ts:4:11, so its value at the site is not known",
				"11:18 rejected\n  `E` is declared again at /main.ts:8:6, so its value at the site is not known",
				"12:18 rejected\n  `N` is declared in a TypeScript namespace or enum"
			])
		})

		it("a var declared in a nested statement", () => {
			attest(
				statusesOf(`import { type } from "arktype"
if (process.argv.length > 99) {
	var V = type("string")
}
export const A = V.or("number")
export const make = (flag: boolean) => {
	if (flag) var def = "string"
	return type(def)
}`)
			).snap([
				"3:10 accepted string",
				"5:18 rejected\n  `V` is a `var` declared in a nested statement, which may not run",
				"8:9 rejected\n  `def` is a `var` declared in a nested statement, which may not run"
			])
		})

		it("reads before a declaration", () => {
			attest(
				statusesOf(`import { type } from "arktype"
function make() { const T = type(x ?? "number"); return T }
export const A = make()
class C { static T = type(x ?? "number") }
export const B = (() => type(x ?? "number"))()
export const D = () => {
	const T = type(y ?? "number")
	var y = "string"
	return T
}
var x = "string"`)
			).snap([
				"2:29 rejected\n  `x` can be read before its declaration (/main.ts:11:5)",
				"4:22 rejected\n  `x` can be read before its declaration (/main.ts:11:5)",
				"5:25 rejected\n  `x` can be read before its declaration (/main.ts:11:5)",
				"7:12 rejected\n  `y` can be read before its declaration (/main.ts:8:6)"
			])
			// a `var` Type is checked where reading it unset throws, not past `undefined`
			attest(
				statusesOf(`import { type } from "arktype"
export function make() { return type(V ?? "string") }
export function make2() { return type(V || "boolean") }
export function make3() { return V?.or("null") }
export function make4() { return V.and({ b: "string" }) }
export const early = [make, make2, make3, make4].map(f => f())
var V = type({ a: "string" })
export const F = () => {
	const T = type(W ?? "string")
	const U = W.or("null")
	var W = type("number")
	return [T, U]
}`)
			).snap([
				"2:33 rejected\n  `V` can be read before its declaration (/main.ts:7:5)",
				"3:34 rejected\n  `V` can be read before its declaration (/main.ts:7:5)",
				"4:34 rejected\n  `V` can be read before its declaration (/main.ts:7:5)",
				"5:34 accepted { a: string, b: string }",
				"7:9 accepted { a: string }",
				"9:12 rejected\n  `W` can be read before its declaration (/main.ts:11:6)",
				"10:12 accepted number | null",
				"11:10 accepted number"
			])
			attest(
				statusesOf(`import { type } from "arktype"
let result: any
function make() { result = type(x ?? "number"); return 1 }
var [y = make(), x] = [undefined, "string"]
export const T = result`)
			).snap([
				"3:28 rejected\n  `x` can be read before its declaration (/main.ts:4:18)"
			])
			attest(
				statusesOf(`import { type } from "arktype"
const [a, b = type(a)] = ["string"]
const { c, d = type(c) } = { c: "number" } as { c: string; d?: unknown }`)
			).snap(["2:15 accepted string", "3:16 accepted number"])
		})

		it("reads an import cycle reaches early", () => {
			const files = {
				"/items.ts": `import "./main.ts"`
			}
			const { sites } = analyze(
				`import { type } from "arktype"
import "./items.ts"
export function make() { return T.or("null") }
const T = type("string")
export function defined() { return type(definition) }
const definition = "number"`,
				files
			)
			attest(
				sites.map(site =>
					[
						`${site.line}:${site.column} ${site.status}`,
						...site.reasons,
						...(site.progress ? [`progress past ${site.progress[1]}`] : [])
					].join("\n  ")
				)
			).snap([
				"3:33 accepted\n  progress past T",
				"4:11 accepted",
				"5:36 accepted\n  progress past definition"
			])
		})

		it("a site reading a Scope the build refuses", () => {
			// its Types are created from what configures it, which a parameter holds
			attest(
				statusesOf(`import { scope } from "arktype"
export function make(jitless: boolean) {
	const $ = scope({}, { jitless })
	const T = $.type("string")
	return T
}`)
			).snap([
				"3:12 rejected\n  arktype holds `jitless` as a value rather than a definition, so it must be static\n  `jitless` is a parameter of make (/main.ts:2:22); its value is known only at runtime",
				"4:12 rejected\n  `$` is the Scope at /main.ts:3:12, which the build refuses"
			])
		})

		it("optional chain ended by parentheses", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const o: any = undefined
const A = type((o?.f)() === undefined ? "string" : "number")
const B = type((o?.a).b === undefined ? "string" : "number")`)
			).snap([
				"3:11 rejected\n  `(o?.f)()` does not call a static helper or pure built-in",
				"4:11 rejected\n  `(o?.a).b` reads a property of undefined, which throws"
			])
		})

		it("opaque values arktype reads", () => {
			attest(
				statusesOf(`import { type } from "arktype"
export function make(v: unknown, n: number, p: (s: string) => boolean) {
	const A = type("string").and(type.unit(v))
	const B = type.string.atMostLength(n)
	const C = type("string").narrow(p)
	const D = type({ a: "string" }).configure({ examples: [v] })
	const E = type({ a: v })
	return [A, B, C, D, E]
}`)
			).snap([
				"3:12 rejected\n  arktype reads `v` while defining the type, so it must be static\n  `v` is a parameter of make (/main.ts:2:22); its value is known only at runtime",
				"4:12 rejected\n  `type.string.atMostLength(n)` reads the structure of `n`, which is not static\n  `n` is a parameter of make (/main.ts:2:34); its value is known only at runtime",
				"5:12 rejected\n  arktype reads `p` while defining the type, so it must be static\n  `p` is a parameter of make (/main.ts:2:45); its value is known only at runtime",
				"6:12 rejected\n  arktype reads `v` while defining the type, so it must be static\n  `v` is a parameter of make (/main.ts:2:22); its value is known only at runtime",
				"7:12 accepted { a: (In: unknown) => Out<unknown> }"
			])
		})

		it("reflection on arktype values", () => {
			attest(
				statusesOf(`import { type, scope } from "arktype"
const A = type({ a: "string" })
const B = type({ [Object.entries(A).find(([k]) => k === "id")![1] as string]: "string" })
const C = type({ [Object.keys(A)[0]]: "string" })
const $ = scope({ a: "string" }).export()
const D = type.enumerated(...Object.keys($))`)
			).snap([
				"2:11 accepted { a: string }",
				"3:11 rejected\n  `Object.entries(A)` reflects on a value other than an object literal or Module",
				"4:11 rejected\n  `Object.keys(A)` reflects on a value other than an object literal or Module",
				"5:11 accepted",
				'6:11 accepted "a"'
			])
		})

		it("Types composed outside any site", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const T = type({ a: "string.trim" })
function g() {
	const t = T
	return t
}
const A = g().or("null")
const B = (Math.random() > 1 ? T : T).out
const { in: I } = T`)
			).snap([
				'/main.ts:7:11  g().or reads or, which a standalone validator lacks\n  `g()` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:8:11  (Math.random() > 1 ? T : T).out reads out, which a standalone validator lacks\n  `Math.random() > 1 ? T : T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:9:9  in: I reads in, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("a Type passed to a non-helper", () => {
			attest(
				unhinted(`import { type } from "arktype"
const T = type({ a: "string" })
function nullable(t: typeof T) {
	const n = t.or("null")
	return n
}
export const X = nullable(T)`)
			).snap([
				"/main.ts:4:12  t.or reads or, which a standalone validator lacks\n  `t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
		})

		it("computed keys, defaults and superclasses", () => {
			attest(
				unhinted(`import { type } from "arktype"
const T = type({ a: "string" })
const k = "in" as const
const { [k]: I } = T
const f = ({ in: J } = T) => J
console.log(f())
class C {
	static User = T
}
class D extends C {}
const U = D.User.or("null")`)
			).snap([
				"/main.ts:4:9  [k]: I reflects on a Type, whose properties a standalone validator doesn't share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:5:14  in: J reads in, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:11:11  D.User.or reads or, which a standalone validator lacks\n  `D.User` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
		})

		it("a Type a getter returns", () => {
			attest(
				unhinted(`import { type } from "arktype"
const schemas = {
	get User() {
		return type({ name: "string" })
	}
}
class Forms {
	static get Admin() {
		return type({ admin: "true" })
	}
}
export const A = schemas.User.or("null")
export const B = Forms.Admin.or("null")`)
			).snap([
				"/main.ts:12:18  schemas.User.or reads or, which a standalone validator lacks\n  `schemas.User` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:13:18  Forms.Admin.or reads or, which a standalone validator lacks\n  `Forms.Admin` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
		})

		it("a Type read through this in a static member", () => {
			attest(
				unhinted(`import { type } from "arktype"
class Holder {
	static t = type({ a: "string" })
	static u = this.t.or("null")
	static and(def: object) {
		return this.t.and(def)
	}
	static {
		this.t.array()
	}
}
class Sub extends Holder {}
export const anded = Sub.and({ b: "string" })`)
			).snap([
				"/main.ts:4:13  this.t.or reads or, which a standalone validator lacks\n  `this.t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:6:10  this.t.and reads and, which a standalone validator lacks\n  `this.t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:9:3  this.t.array reads array, which a standalone validator lacks\n  `this.t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
		})

		it("a parameter the build can't see called", () => {
			attest(
				diagnosticsOf(`import { type, type Type } from "arktype"
export function nullable(t: Type) {
	const n = t.or("null")
	return n
}
export const forms = {
	optional(t: typeof User) {
		return t.or("undefined")
	}
}
const User = type({ name: "string" })`)
			).snap([
				"/main.ts:3:12  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator\n  If it isn't a Type, annotate it with its type. If it is, build with runtime: \"arktype\".",
				"/main.ts:8:10  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator\n  If it isn't a Type, annotate it with its type. If it is, build with runtime: \"arktype\"."
			])
		})

		// as a bundler's alias or virtual module the build doesn't know of
		const unresolvedReadsOf = (opts?: PrecompileOptions) => {
			const source = `import { type } from "arktype"
import { User, port } from "~/schemas"
import { z } from "astro:content"
export const Admin = User.and({ role: "'admin'" })
export const Guest = User.or("null")
export const url = port.toFixed()
export const Tag = z.string().optional()`
			const host = memoryHost({ "/main.ts": source })
			const resolve: typeof host.resolve = (specifier, importer) =>
				specifier.startsWith("~/") || specifier.includes(":") ?
					undefined
				:	host.resolve(specifier, importer)
			return new Precompiler({ ...host, resolve }, opts)
				.analyze(source, "/main.ts")
				.diagnostics.map(d => `${d.severity} ${renderDiagnostic(d)}`)
		}

		it("a read off an import the build can't resolve", () => {
			attest(unresolvedReadsOf()).snap([
				"error /main.ts:4:22  User.and reads and, which a standalone validator lacks\n  `User` comes from `~/schemas`, which the build can't resolve, so it may be a Type, which the standalone runtime replaces with a validator\n  If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it. Set allowUnsafe: true to build anyway, with a warning.",
				"error /main.ts:7:20  z.string().optional reads optional, which a standalone validator lacks\n  `z.string()` comes from `astro:content`, which the build can't resolve, so it may be a Type, which the standalone runtime replaces with a validator\n  If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it. Set allowUnsafe: true to build anyway, with a warning."
			])
		})

		it("a read off an import the build can't resolve with allowUnsafe", () => {
			attest(unresolvedReadsOf({ allowUnsafe: true })).snap([
				"warning /main.ts:4:22  User.and reads and, which a standalone validator lacks\n  `User` comes from `~/schemas`, which the build can't resolve, so it may be a Type, which the standalone runtime replaces with a validator\n  If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it.",
				"warning /main.ts:7:20  z.string().optional reads optional, which a standalone validator lacks\n  `z.string()` comes from `astro:content`, which the build can't resolve, so it may be a Type, which the standalone runtime replaces with a validator\n  If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it."
			])
		})

		it("instance fields", () => {
			attest(
				unhinted(`import { type } from "arktype"
import { HttpClient } from "http"
class Base {
	user = type({ name: "string" })
}
class Forms extends Base {
	guest = type("null")
	list = []
	constructor(private http: HttpClient) {
		super()
		this.list.push(type("string"))
	}
	get admin() {
		return type({ role: "string" })
	}
	make() {
		return type("number")
	}
	load() {
		return this.http.get("/guest").pipe(this.guest.assert)
	}
}
const http = new HttpClient()
console.log(new Forms(http).user.or, new Forms(http).admin.or)
console.log(new Forms(http).make().or, new Forms(http).list[0].or)`)
			).snap([
				"/main.ts:24:13  new Forms(http).user.or reads or, which a standalone validator lacks\n  the build can't tell where `new Forms(http).user` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:24:38  new Forms(http).admin.or reads or, which a standalone validator lacks\n  the build can't tell where `new Forms(http).admin` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:25:13  new Forms(http).make().or reads or, which a standalone validator lacks\n  the build can't tell where `new Forms(http).make()` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:25:40  new Forms(http).list[0].or reads or, which a standalone validator lacks\n  the build can't tell where `new Forms(http).list[0]` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("fields that read each other, each solved once", () => {
			const fields = Array.from(
				{ length: 26 },
				(_, i) => `f${i + 2} = this.f${i + 1} ?? this.f${i}`
			)
			attest(
				unhinted(`import { type } from "arktype"
class Chain {
	f0 = type("string")
	f1 = type("number")
	${fields.join("\n\t")}
}
export const X = new Chain().f27.or("null")`)
			).snap([
				"/main.ts:32:18  new Chain().f27.or reads or, which a standalone validator lacks\n  the build can't tell where `new Chain().f27` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type in an options object", () => {
			attest(
				unhinted(`import { type } from "arktype"
import { db } from "db"
const route = (opts: { db: typeof db; input: unknown }) => opts.db.select()
const log = opts => {
	console.log(opts.db.select(), opts.input.or)
}
route({ db, input: type({ name: "string" }) })
log({ db, input: type({ name: "string" }) })`)
			).snap([
				"/main.ts:5:32  opts.input.or reads or, which a standalone validator lacks\n  `opts.input` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
		})

		it("recursive helper calls, each solved once", () => {
			const writes = Array.from({ length: 9 }, (_, i) => `write(value.m${i})`)
			attest(
				unhinted(`import { type } from "arktype"
function write(value) {
	${writes.join("\n\t")}
	console.log(value.m0.or)
}
write({ m0: type("string") })`)
			).snap([
				"/main.ts:12:14  value.m0.or reads or, which a standalone validator lacks\n  `value.m0` is read off what may be an arktype value, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("Types through built-ins", () => {
			attest(
				unhinted(`import { type } from "arktype"
const A = type("string")
const schemas = {}
Object.assign(schemas, { A })
const forms = {
	user: A,
	nullable() {
		return this.user.or("null")
	}
}
console.log(new Map([["a", A]]).get("a").or, new Set([A]).values().next().value.or, schemas.A.or)
Promise.resolve(A).then(t => t.or("null"))`)
			).snap([
				"/main.ts:8:10  this.user.or reads or, which a standalone validator lacks\n  the build can't tell where `this.user` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				'/main.ts:11:13  new Map([["a", A]]).get("a").or reads or, which a standalone validator lacks\n  the build can\'t tell where `new Map([["a", A]]).get("a")` comes from, so it may be a Type, which the standalone runtime replaces with a validator',
				"/main.ts:11:46  new Set([A]).values().next().value.or reads or, which a standalone validator lacks\n  the build can't tell where `new Set([A]).values().next().value` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:11:85  schemas.A.or reads or, which a standalone validator lacks\n  the build can't tell where `schemas.A` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:12:30  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("annotations that may be Types", () => {
			attest(
				unhinted(`import { type, type Submodule, type Type } from "arktype"
const A = type("string")
const forms = [A] as const
const load = async () => ({ forms: { user: A } })
const loaded: { forms: Record<string, any> } = await load()
console.log(forms.map(f => f.or), loaded.forms.user.or)
export function constrained<t extends Type>(t: t, u: type.Any, m: Submodule<{ user: string }>) {
	console.log(t.or, u.or, m.user.or)
}
export function constrainedAny<t extends type.Any>(t: t) {
	console.log(t.or)
}`)
			).snap([
				"/main.ts:6:28  f.or reads or, which a standalone validator lacks\n  the build can't tell where `f` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:6:35  loaded.forms.user.or reads or, which a standalone validator lacks\n  the build can't tell where `loaded.forms.user` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:8:14  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:8:20  u.or reads or, which a standalone validator lacks\n  the build can't tell where `u` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:8:26  m.user.or reads or, which a standalone validator lacks\n  the build can't tell where `m.user` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:11:14  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type annotated as something else", () => {
			attest(
				unhinted(`import { type } from "arktype"
interface Nullable {
	or(def: string): unknown
}
const fallback = { or: (def: string) => def }
console.log(fallback.or("a"))
let x: Nullable = type("string")
export const X = x.or("null")
if (Math.random() > 2) x = fallback`)
			).snap([
				'/main.ts:8:18  x.or("null") cannot be precompiled\n  `x` is assigned at /main.ts:9:24, so its value at the site is not known'
			])
		})

		it("a Type read from a container the build can't resolve", () => {
			attest(
				unhinted(`import { type } from "arktype"
const schemas: Record<string, any> = {}
schemas.User = type({ name: "string" })
const registry = new Map()
registry.set("admin", type({ role: "string" }))
const list = [type("string"), type("number")]
export const A = schemas.User.or("null")
export const B = registry.get("admin").or("null")
export const C = list[Number(process.env.I)].or("null")`)
			).snap([
				"/main.ts:7:18  schemas.User.or reads or, which a standalone validator lacks\n  the build can't tell where `schemas.User` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				'/main.ts:8:18  registry.get("admin").or reads or, which a standalone validator lacks\n  the build can\'t tell where `registry.get("admin")` comes from, so it may be a Type, which the standalone runtime replaces with a validator',
				"/main.ts:9:18  list[Number(process.env.I)].or reads or, which a standalone validator lacks\n  the build can't tell where `list[Number(process.env.I)]` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a callback's parameter", () => {
			attest(
				unhinted(`import { type } from "arktype"
import { builder, defineEvent } from "events"
const User = type({ name: "string" })
const list = [User]
defineEvent(User, ({ event }) => event.default)
builder.input(User).handler(({ input }) => input.to)
list.forEach(user => user.or("null"))`)
			).snap([
				"/main.ts:7:22  user.or reads or, which a standalone validator lacks\n  the build can't tell where `user` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("data the build lost track of", () => {
			attest(
				unhinted(`import { type } from "arktype"
import type { Options } from "options"
type Endpoint = { responses: Record<string, unknown> }
const load = async () => ({ user: type({ name: "string" }) })
const loaded = await load()
const endpoint = loaded as Endpoint
const options: Options = await load()
console.log(loaded.default, endpoint.responses.default, options.default)
const loadList = async () => [type("string")]
const list = await loadList()
console.log(list.map(t => t), list.filter(Boolean), list.or)`)
			).snap([
				"/main.ts:8:13  loaded.default reads default, which a standalone validator lacks\n  the build can't tell where `loaded` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:11:53  list.or reads or, which a standalone validator lacks\n  the build can't tell where `list` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("iterated and returned Types", () => {
			attest(
				unhinted(`import { type } from "arktype"
const forms = {
	make() {
		return type("string")
	}
}
for (const t of [type("number")]) console.log(t.or("null"))
export const X = forms.make().or("null")`)
			).snap([
				"/main.ts:7:47  t.or reads or, which a standalone validator lacks\n  `t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:8:18  forms.make().or reads or, which a standalone validator lacks\n  `forms.make()` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
		})

		it("introspection reads off a Type the build lost track of", () => {
			attest(
				unhinted(`import { type } from "arktype"
const User = type({ name: "string" })
const routes = [{ body: User }]
const list = [User]
export const a = routes.map(r => r.body.expression)
export const b = list.map(t => t.toJsonSchema())
class C {
	t = User
	json() {
		return JSON.stringify(this.t)
	}
	printed() {
		return \`\${this.t}\`
	}
	described() {
		return this.t.description
	}
}
export const c = new C()`)
			).snap([
				"/main.ts:5:34  r.body.expression reads expression, which a standalone validator lacks\n  the build can't tell where `r.body` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:6:32  t.toJsonSchema reads toJsonSchema, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:10:10  JSON.stringify(this.t) reads toJSON, which a standalone validator lacks\n  the build can't tell where `this.t` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:13:10  `${this.t}` reads expression, which a standalone validator lacks\n  the build can't tell where `this.t` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:16:10  this.t.description reads description, which a standalone validator lacks\n  the build can't tell where `this.t` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type passed where the build can't see the call", () => {
			attest(
				unhinted(`import { type } from "arktype"
export const widen = (t: any) => t.or("null")
export const forms = {
	optional(t) {
		return t.or("undefined")
	}
}
export class Repo {
	constructor(readonly schema: any) {}
	widen() {
		return this.schema.or("null")
	}
}
export const User = type({ name: "string" })`)
			).snap([
				"/main.ts:2:34  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:5:10  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:11:10  this.schema.or reads or, which a standalone validator lacks\n  the build can't tell where `this.schema` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type held where the build loses it", () => {
			attest(
				unhinted(`import { type } from "arktype"
const User = type({ name: "string" })
class Repo {
	constructor(readonly schema: typeof User) {}
	widen() {
		return this.schema.or("null")
	}
}
class Holder {
	t = User
	get() {
		return this.t
	}
}
class Static {
	static T: any
	static {
		Static.T = User
	}
}
export const a = new Repo(User).widen()
export const b = new Holder().get().or("null")
export const c = Static.T.or("null")
export const d = new Proxy(User, {}).or("null")`)
			).snap([
				"/main.ts:6:10  this.schema.or reads or, which a standalone validator lacks\n  the build can't tell where `this.schema` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:22:18  new Holder().get().or reads or, which a standalone validator lacks\n  the build can't tell where `new Holder().get()` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:23:18  Static.T.or reads or, which a standalone validator lacks\n  the build can't tell where `Static.T` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:24:18  new Proxy(User, {}).or reads or, which a standalone validator lacks\n  the build can't tell where `new Proxy(User, {})` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("members validators lack, outside sites", () => {
			attest(
				unhinted(`import { type } from "arktype"
const T = type({ a: "string" })
const jsonOf = (t: typeof T) => t.json
console.log(T.expression, T.toString(), Object.is(T, T))
console.log(jsonOf(T), "json" in T, JSON.stringify(T))
console.log(String(T), \`\${T}\`, "" + T)`)
			).snap([
				"/main.ts:3:33  t.json reads json, which a standalone validator lacks\n  `t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:4:27  T.toString reads expression, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:5:37  JSON.stringify(T) reads toJSON, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:6:13  String(T) reads expression, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:6:24  `${T}` reads expression, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				'/main.ts:6:32  "" + T reads expression, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read'
			])
		})

		it("members a build bakes", () => {
			const source = `import { type } from "arktype"
const T = type({ a: "string" })
const jsonOf = (t: typeof T) => t.json
console.log(jsonOf(T), "json" in T, JSON.stringify(T), T.toJSON, \`\${T}\`)`
			attest(
				diagnosticsOf(
					source,
					{},
					{ members: { json: true, toJSON: true, expression: true } }
				)
			).equals([])
			attest(
				diagnosticsOf(source, {}, { members: { toJSON: true } }).map(
					diagnostic => diagnostic.split("\n")[0]
				)
			).snap([
				"/main.ts:3:33  t.json reads json, which a standalone validator lacks",
				"/main.ts:4:66  `${T}` reads expression, which a standalone validator lacks"
			])
		})

		it("members a build drops", () => {
			const source = `import { scope, type } from "arktype"
const T = type({ a: "string" })
console.log(T.allows(1), T.assert({ a: "" }), T.meta, T["~standard"])
console.log(T.traverse(1), T.from({ a: "" }), String(T))
console.log(scope({ a: "string" }).type("a").assert(""))`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				"/main.ts:4:47  String(T) reads expression, which a standalone validator lacks"
			])
			attest(
				diagnosticsOf(
					source,
					{},
					{
						members: {
							assert: false,
							meta: false,
							"~standard": false,
							methods: false
						}
					}
				).map(d => d.split("\n")[0])
			).snap([
				"/main.ts:3:26  T.assert reads assert, which a standalone validator lacks",
				"/main.ts:3:47  T.meta reads meta, which a standalone validator lacks",
				'/main.ts:3:55  T["~standard"] reads ~standard, which a standalone validator lacks',
				"/main.ts:4:13  T.traverse reads traverse, which a standalone validator lacks",
				"/main.ts:4:28  T.from reads from, which a standalone validator lacks",
				"/main.ts:4:47  String(T) reads toString, which a standalone validator lacks",
				'/main.ts:5:13  scope({ a: "string" }).type("a").assert reads assert, which a standalone validator lacks'
			])
			// a validator prints its expression through the toString() it inherits
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
const T = type({ a: "string" })
console.log(String(T), T.expression)`,
					{},
					{ members: { expression: true, methods: false } }
				).map(d => d.split("\n")[0])
			).snap([
				"/main.ts:3:13  String(T) reads toString, which a standalone validator lacks"
			])
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
const values: unknown[] = [1, type("string")]
console.log(values.map(v => (v as any).from))`,
					{},
					{ members: { methods: false } }
				)
			).snap([
				"/main.ts:3:29  (v as any).from reads from, which a standalone validator lacks\n  the build can't tell where `v as any` comes from, so it may be a Type, which the standalone runtime replaces with a validator\n  If it isn't a Type, annotate it with its type. If it is, leave members[\"methods\"] unset."
			])
		})

		describe("options a build can't take", () => {
			const refused: [
				name: string,
				opts: PrecompileOptions,
				message: string
			][] = [
				[
					"runtime other than arktype",
					{ runtime: "arktyp" as never },
					'runtime must be "arktype" (was "arktyp")'
				],
				[
					"non-object members",
					{ members: true as never },
					"members must be an object (was true)"
				],
				[
					"unknown member",
					{ members: { json: true, and: true } as never },
					"members.and must be removed (was true)"
				],
				[
					"non-boolean member",
					{ members: { assert: 0 } as never },
					"members.assert must be boolean (was 0)"
				],
				[
					"~standard.jsonSchema without ~standard",
					{ members: { "~standard": false, "~standard.jsonSchema": true } },
					standardJsonSchemaWithoutStandardMessage
				],
				[
					"non-path config",
					{ config: true as never },
					"config must be a module path or false (was true)"
				],
				[
					"empty config",
					{ config: "" },
					'config must be a module path or false (was "")'
				],
				[
					"invalid enum option",
					{ checks: "all" as never },
					'checks must be "helpers", "none" or "types" (was "all")'
				],
				[
					"non-boolean option",
					{ freeze: 0 as never },
					"freeze must be boolean (was 0)"
				],
				[
					"unknown option",
					{ optimise: "size" } as never,
					'optimise must be removed (was "size")'
				],
				[
					"unknown preset",
					{ preset: "tiny" as never },
					'preset must be "introspectable" or "smallest" (was "tiny")'
				],
				[
					"standalone option with runtime arktype",
					{ runtime: "arktype", freeze: true },
					writeArktypeRuntimeOptionMessage("freeze")
				],
				[
					"countsKeys with runtime arktype",
					{ runtime: "arktype", countsKeys: true },
					writeArktypeRuntimeOptionMessage("countsKeys")
				],
				[
					"non-boolean shadow",
					{ shadow: "true" as never },
					'shadow must be boolean (was "true")'
				],
				[
					"shadow with runtime arktype",
					{ runtime: "arktype", shadow: true },
					writeArktypeRuntimeOptionMessage("shadow")
				],
				[
					"config false with runtime arktype",
					{ runtime: "arktype", config: false },
					writeArktypeRuntimeOptionMessage("config: false")
				]
			]
			for (const [name, opts, message] of refused) {
				it(name, () => {
					attest(() => new Precompiler(memoryHost({}), opts)).throws(message)
				})
			}
		})

		it("a container method read off a Module the build can't read", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
const M = (Math.random() > 0.5 ? scope({ Cart: { items: "string[]" } }) : scope({ Cart: { items: "number[]" } })).export()
export const items = (data: unknown) => M.Cart.assert(data).items.map(i => i)`)
			).snap([
				'/main.ts:2:11  (Math.random() > 0.5 ? scope({ Cart: { items: "string[]" } … can\'t be precompiled yet\n  `Math.random() > 0.5 ? scope({ Cart: { items: "string[]" } }…` may be a Scope, which a standalone build replaces with an object that lacks `export`\n  Assign it to a const and read `export` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:3:41  M.Cart.assert(data).items.map reads map, which a standalone validator lacks\n  `M.Cart.assert(data).items` is read off what may be an arktype value, so it may be a Type, which the standalone runtime replaces with a validator\n  If it isn\'t a Type, read it off a value the build can tell from a Type, like a Module defined in a const as `scope({ ... }).export()`. If it is, build with runtime: "arktype".'
			])
		})

		it("reflection on a Type outside any site", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const T = type({ a: "string" })
console.log(Object.keys(T), { ...T }, T[process.argv[2] as "json"])
const { description, ...rest } = T
for (const k in T) console.log(k)`)
			).snap([
				'/main.ts:3:13  Object.keys(T) reflects on a Type, whose properties a standalone validator doesn\'t share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:3:31  ...T reflects on a Type, whose properties a standalone validator doesn\'t share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:3:39  T[process.argv[2] as "json"] reflects on a Type, whose properties a standalone validator doesn\'t share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:4:9  description reads description, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:4:22  ...rest reflects on a Type, whose properties a standalone validator doesn\'t share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:5:1  for (const k in T) console.log(k) reflects on a Type, whose properties a standalone validator doesn\'t share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("a Scope read off a function's return", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
const getPlaces = () => scope({ ocean: { color: "'blue'" } })
const $ = getPlaces()
export const Ocean = $.type("ocean")
export const Place = getPlaces().type("ocean")`)
			).snap([
				'/main.ts:5:22  getPlaces().type("ocean") can\'t be precompiled yet\n  `getPlaces()` may be a Scope, which a standalone build replaces with an object that lacks `type`\n  Assign it to a const and read `type` off that, which the build precompiles, or build with runtime: "arktype".'
			])
		})

		it("a Scope passed to code the build can't see", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
declare const each: (create: () => unknown) => void
each(() => scope({ a: "string" }))`)
			).snap([
				'/main.ts:3:12  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".'
			])
		})

		it("a Generic read off a function's return", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const G = type("<t>", { t: "t" })
const getG = () => G
export const params = getG().params
export const names = (flag: boolean) => (flag ? G : type("<u>", { u: "u" })).names`)
			).snap([
				'/main.ts:4:23  getG().params can\'t be precompiled yet\n  `getG()` may be a Generic, which a standalone build replaces with an object that lacks `params`\n  Assign it to a const and read `params` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:5:41  (flag ? G : type("<u>", { u: "u" })).names can\'t be precompiled yet\n  `flag ? G : type("<u>", { u: "u" })` may be a Generic, which a standalone build replaces with an object that lacks `names`\n  Assign it to a const and read `names` off that, which the build precompiles, or build with runtime: "arktype".'
			])
		})

		it("a Scope or Generic read off an annotated parameter", () => {
			attest(
				diagnosticsOf(`import { scope, type, type Generic, type Scope } from "arktype"
const $ = scope({ a: "string" })
export const viaTypeof = (s: typeof $) => s.type("a")
export const viaScope = (s: Scope) => s.export()
export const viaGeneric = (g: Generic) => g.params`)
			).snap([
				'/main.ts:3:43  s.type("a") can\'t be precompiled yet\n  `s` may be a Scope, which a standalone build replaces with an object that lacks `type`\n  Assign it to a const and read `type` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:4:39  s.export() can\'t be precompiled yet\n  `s` may be a Scope, which a standalone build replaces with an object that lacks `export`\n  Assign it to a const and read `export` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:5:43  g.params can\'t be precompiled yet\n  `g` may be a Generic, which a standalone build replaces with an object that lacks `params`\n  Assign it to a const and read `params` off that, which the build precompiles, or build with runtime: "arktype".'
			])
		})

		it("a Scope passed on to code the build can't see", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
declare const each: (value: unknown) => void
export const Exported = scope({ a: "string" })
each(() => Exported)
function make() {
	return scope({ b: "string" })
}
each(make)
const handed = scope({ c: "string" })
const hand = (s: unknown) => each(s)
hand(handed)
const listed = scope({ d: "string" })
const list: unknown[] = []
list.push(listed)
const kept = scope({ e: "string" })
const keep = (s: typeof kept) => s
export const E = keep(kept).type("e")`)
			).snap([
				'/main.ts:3:25  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:6:9  scope({ b: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:9:16  scope({ c: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:12:16  scope({ d: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:17:18  keep(kept).type("e") can\'t be precompiled yet\n  `keep(kept)` may be a Scope, which a standalone build replaces with an object that lacks `type`\n  Assign it to a const and read `type` off that, which the build precompiles, or build with runtime: "arktype".'
			])
		})

		it("a Scope handed on in an object or array literal", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
declare const each: (value: unknown) => void
each({ s: scope({ a: "string" }) })
const listed = scope({ b: "string" })
each([listed])
const nested = scope({ c: "string" })
const options = { defs: [{ nested }] }
each(options)
const spread = scope({ d: "string" })
each([...[spread]])
each({ ...{ spread: scope({ e: "string" }) } })`)
			).snap([
				'/main.ts:3:11  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:4:16  scope({ b: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:6:16  scope({ c: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:9:16  scope({ d: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:11:21  scope({ e: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".'
			])
		})

		it("a Scope handed on through a let or var", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
declare const each: (value: unknown) => void
let assigned: unknown
assigned = scope({ a: "string" })
each(assigned)
const $ = scope({ b: "string" })
let reassigned: unknown = 1
reassigned = $
each(reassigned)
var declared = scope({ c: "string" })
each(declared)
let read = scope({ d: "string" })
export const D = read.type("d")`)
			).snap([
				'/main.ts:4:12  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:6:11  scope({ b: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:10:16  scope({ c: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".'
			])
		})

		it("a Scope stored on an object", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
declare const each: (value: unknown) => void
const target: Record<string, unknown> = {}
target.s = scope({ a: "string" })
class Fields {
	s = scope({ b: "string" })
}
each(new Fields())
const assigned = scope({ c: "string" })
each(Object.assign({}, { assigned }))
const got = scope({ d: "string" })
each({
	get got() {
		return got
	}
})`)
			).snap([
				'/main.ts:4:12  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:6:6  scope({ b: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:9:18  scope({ c: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:11:13  scope({ d: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".'
			])
		})

		it("a Scope read off a literal the build can't follow", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
const list = [scope({ a: "string" })]
export const A = (i: number) => list[i].type("a")
const options = { s: scope({ b: "string" }) }
const read = (o: typeof options) => o.s.type("b")
export const B = read(options)
for (const s of [scope({ c: "string" })]) s.type("c")
const kept = { s: scope({ d: "string" }) }
export const D = kept.s.type("d")
const indexed = [scope({ e: "string" })]
export const E = indexed[0].type("e")`)
			).snap([
				'/main.ts:2:15  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:4:22  scope({ b: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:7:18  scope({ c: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:7:43  s.type("c") can\'t be precompiled yet\n  `s` may be a Scope, which a standalone build replaces with an object that lacks `type`\n  Assign it to a const and read `type` off that, which the build precompiles, or build with runtime: "arktype".'
			])
		})

		it("a Scope's members copied or tested", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
const $ = scope({ a: "string" })
export const copy = { ...$ }
const keyed = scope({ b: "string" })
export const has = "type" in keyed
const { type: t } = scope({ c: "string" })
export const C = t
const compared = scope({ d: "string" })
export const isDefined = compared !== undefined && typeof compared === "object"`)
			).snap([
				'/main.ts:2:11  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:4:15  scope({ b: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:6:21  scope({ c: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".'
			])
		})

		it("a Scope thrown or yielded", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
export const fail = () => {
	throw scope({ a: "string" })
}
export function* scopes() {
	yield scope({ b: "string" })
}`)
			).snap([
				'/main.ts:3:8  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:6:8  scope({ b: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".'
			])
		})

		it("a Scope returned in a literal", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
declare const each: (value: unknown) => void
const make = () => ({ s: scope({ a: "string" }) })
each(make())
const wrap = () => [scope({ b: "string" })]
export const B = wrap()[0].type("b")`)
			).snap([
				'/main.ts:3:26  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:6:18  wrap()[0].type("b") can\'t be precompiled yet\n  `wrap()[0]` may be a Scope, which a standalone build replaces with an object that lacks `type`\n  Assign it to a const and read `type` off that, which the build precompiles, or build with runtime: "arktype".'
			])
		})

		it("a Scope another module precompiles passed to code the build can't see", () => {
			const files = (manifest: object) => ({
				"/defs.ts": `import { scope, type } from "arktype"
export const $ = scope({ a: "string" })
export const G = type("<t>", { t: "t" })
export const User = $.type("a")
export const held = { s: scope({ b: "string" }) }
export default scope({ c: "string" })`,
				"/island.ts": `import { scope } from "arktype"
// @ark-runtime
export const islanded = scope({ a: "string" })`,
				"/node_modules/lib/package.json": JSON.stringify(manifest),
				"/node_modules/lib/index.js": `import { scope } from "arktype"
export const libScope = scope({ a: "string" })`
			})
			const source = `import scoped, { $, G, User, held } from "./defs.ts"
import * as defs from "./defs.ts"
import { islanded } from "./island.ts"
import { libScope } from "lib"
declare const each: (value: unknown) => void
each($)
each(G)
each(held)
each(held.s)
each(scoped)
each(defs.$)
each(defs)
each(User)
each(islanded)
each(libScope)
export const A = $.type("a")
export { $ }`
			const optedIn = diagnosticsOf(
				source,
				files({ name: "lib", arktype: { precompile: true } })
			)
			attest(optedIn).snap([
				"/main.ts:6:6  $ can't be precompiled yet\n  it's passed to code the build can't see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: \"arktype\".",
				"/main.ts:7:6  G can't be precompiled yet\n  it's passed to code the build can't see, which may read what a precompiled Generic lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: \"arktype\".",
				"/main.ts:8:6  held can't be precompiled yet\n  it's passed to code the build can't see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: \"arktype\".",
				"/main.ts:9:6  held can't be precompiled yet\n  it's passed to code the build can't see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: \"arktype\".",
				"/main.ts:10:6  scoped can't be precompiled yet\n  it's passed to code the build can't see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: \"arktype\".",
				"/main.ts:11:6  defs.$ can't be precompiled yet\n  it's passed to code the build can't see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: \"arktype\".",
				"/main.ts:12:6  defs can't be precompiled yet\n  it's passed to code the build can't see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: \"arktype\".",
				"/main.ts:15:6  libScope can't be precompiled yet\n  it's passed to code the build can't see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: \"arktype\"."
			])
			// a package that doesn't opt in isn't precompiled, so its Scope is arktype's
			attest(diagnosticsOf(source, files({ name: "lib" }))).equals(
				optedIn.slice(0, -1)
			)
		})

		it("a Scope exported where its importers can't read it", () => {
			attest(
				diagnosticsOf(`import { scope } from "arktype"
declare const flag: boolean
const a = scope({ a: "string" })
export const either = flag ? a : undefined
const b = scope({ b: "string" })
export const nested = { s: flag ? b : undefined }
export let written = scope({ c: "string" })
written = scope({ d: "string" })
export const make = () => scope({ e: "string" })
export const read = scope({ f: "string" })
export const holder = { s: scope({ g: "string" }) }`)
			).snap([
				'/main.ts:3:11  scope({ a: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:5:11  scope({ b: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:7:22  scope({ c: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:8:11  scope({ d: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".',
				'/main.ts:9:27  scope({ e: "string" }) can\'t be precompiled yet\n  it\'s passed to code the build can\'t see, which may read what a precompiled Scope lacks\n  Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".'
			])
		})

		it("data a union of tuple expressions returns", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const Payload = type({ type: "'a'" }, "|", { type: "'b'" })
export const tagOf = (data: unknown) => {
	const out = Payload(data)
	return out instanceof type.errors ? "" : out.type
}`)
			).equals([])
		})

		it("packages reading arktype's nodes", () => {
			attest(
				diagnosticsOf(`import { discriminate } from "arksets"
import { ArkErrors, hasArkKind, Traversal } from "@ark/schema"
import { type } from "arktype"
const T = type({ a: "0" }).or({ a: "1" })
const check = (f: () => void) => f()
check(() => console.log(discriminate(T as never), hasArkKind(T, "root")))
console.log(T({}) instanceof ArkErrors, Traversal.name)
// @ark-runtime
const D = discriminate(type({ a: "0" }).or({ a: "1" }).internal as never)`)
			).snap([
				'/main.ts:6:25  `discriminate` is used outside a runtime island\n  arksets reads the nodes arktype creates, which a standalone build replaces with validators\n  Read arktype\'s nodes in a definition marked // @ark-runtime, or build with runtime: "arktype".',
				'/main.ts:6:51  `hasArkKind` is used outside a runtime island\n  @ark/schema reads the nodes arktype creates, which a standalone build replaces with validators\n  Read arktype\'s nodes in a definition marked // @ark-runtime, or build with runtime: "arktype".',
				"/main.ts:7:30  `ArkErrors` is @ark/schema's, not the standalone runtime's\n  what a standalone validator creates isn't an instance of @ark/schema's ArkErrors\n  Import ArkErrors from arktype, which a standalone build resolves to its runtime, or read type.errors."
			])
		})

		it("@ark/schema or islands without error detail", () => {
			attest(
				diagnosticsOf(
					`import { Traversal } from "@ark/schema"
import { type } from "arktype"
console.log(Traversal.name)
// @ark-runtime
const T = type("string")`,
					{},
					{ errors: "none" }
				)
			).snap([
				"/main.ts:3:13  `Traversal` is @ark/schema's, not the standalone runtime's\n  what a standalone validator creates isn't an instance of @ark/schema's Traversal\n  Import Traversal from arktype, which a standalone build resolves to its runtime.",
				'/main.ts:5:1  a runtime island returns arktype\'s errors, which aren\'t instances of type.errors under errors: "none"\n  a build whose errors say only that data is invalid gives its validators a runtime of their own\n  Precompile the definition, or build without errors: "none".'
			])
		})

		it("islands where errors are written for size", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
// @ark-runtime
const T = type("string")`,
					{},
					{ optimize: "size" }
				)
			).snap([
				'/main.ts:3:1  a runtime island returns arktype\'s errors, which aren\'t instances of type.errors under optimizeErrors: "size"\n  a build writing its errors for size gives its validators a runtime of their own\n  Precompile the definition, or build with optimizeErrors: "speed".'
			])
		})

		it("a locale outside a runtime island", () => {
			attest(
				diagnosticsOf(`import { de } from "arktype/locales/de"
import { type } from "arktype"
const T = type("string")
console.log(T.assert, de.tag)
// @ark-runtime
const D = type("string")(1).toLocaleString(de)`)
			).snap([
				"/main.ts:4:23  `de` is used outside a runtime island\n  arktype/locales/de writes arktype's errors in a locale, which needs the description writers of arktype's nodes, so a standalone validator writes its errors only in en\n  Write errors in a locale in a definition marked // @ark-runtime, or build with runtime: \"arktype\"."
			])
		})

		it("built-ins that write", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const o = { a: "string" }
const p = { a: "string" }
const set = (x: any) => Object.assign(x, { a: "number" })
export const A = type(o)
export const B = type(set(o).a)
export const C = type(Object.freeze(p).a)
export const D = type(Object.assign({}, p, { b: "number" }))
export const E = type(Object.assign({}, o, { b: "number" }))
export const F = type(Object.freeze({ a: "string" }))`)
			).snap([
				"5:18 accepted { a: string }",
				'6:18 rejected\n  `Object.assign(x, { a: "number" })` writes to an object other than a new object or array literal',
				"7:18 rejected\n  `Object.freeze(p)` writes to an object other than a new object or array literal",
				"8:18 accepted { a: string, b: number }",
				"9:18 rejected\n  `o` is written at /main.ts:6:23, so its value at the site is not known",
				"10:18 accepted { a: string }"
			])
		})

		it("esbuild's keepNames", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { isLong } from "./other.ts"
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, "name", { value, configurable: true })
const isShort = __name((s: string) => s.length < 3, "isShort")
export const A = type("string").narrow(isShort)
export const B = type("string").narrow(__name(isLong, "isLong"))
export const C = type("string").narrow(__defProp((s: string) => s.length < 3, "name", { value: "short" }))
export const D = type("string").narrow(__defProp((s: string) => s.length < 3, "length", { value: 2, configurable: true }))
export const E = type(__defProp({ a: "string" }, "name", { value: "o", configurable: true }))`,
					{ "/other.ts": "export const isLong = (s: string) => s.length > 1" }
				)
			).snap([
				"6:18 accepted string",
				'7:18 rejected\n  `__defProp(target, "name", { value, configurable: true })` defines a property other than the name of a function its module created',
				'8:18 rejected\n  `__defProp((s: string) => s.length < 3, "name", { value: "sh…` defines a property other than the name of a function its module created',
				'9:18 rejected\n  `__defProp((s: string) => s.length < 3, "length", { value: 2…` defines a property other than the name of a function its module created',
				'10:18 rejected\n  `__defProp({ a: "string" }, "name", { value: "o", configurab…` defines a property other than the name of a function its module created'
			])
		})

		it("static helpers esbuild's keepNames names", () => {
			attest(
				statusesOf(`import { type } from "arktype"
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, "name", { value, configurable: true })
const field = __name((n: number) => \`string <= \${n}\`, "field")
function list(t: string) { return \`\${t}[]\` }
__name(list, "list")
export const A = type(field(5))
export const B = type(list("number"))`)
			).snap(["7:18 accepted string <= 5", "8:18 accepted number[]"])
		})

		it("static helpers a minified keepNames names", () => {
			attest(
				statusesOf(`import { type as o } from "arktype"
var i=Object.defineProperty;var e=(n,s)=>i(n,"name",{value:s,configurable:!0});
function r(n){return{a:"number >= "+n}}e(r,"field");
export const a=o(r(5))`)
			).snap(["4:16 accepted { a: number >= 5 }"])
		})

		it("conversions of objects", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const o = { toString: () => "12" }
const A = type({ [parseInt(o as never)]: "string" })
const B = type({ [Number.parseFloat(o as never)]: "string" })
const C = type({ [Number.parseInt("12")]: "string" })`)
			).snap([
				"3:11 rejected\n  `parseInt(o as never)` converts an object to a primitive, which runs its methods",
				"4:11 rejected\n  `Number.parseFloat(o as never)` converts an object to a primitive, which runs its methods",
				"5:11 accepted { 12: string }"
			])
		})

		it("conversions of objects inside built-ins", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const isLong = (s: string) => s.length > 3
class Apple {}
class Zebra {}
const Ap = type.instanceOf(Apple)
const Z = type.instanceOf(Zebra)
const pick = ({ [Ap as never]: v }: Record<string, string>) => v
const A = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => [n].join("").includes("isLong") })
const B = type([Ap, Z].join("") === "Type<Apple>Type<Zebra>" ? "string" : "number")
const D = type(Object.keys(Object.fromEntries([[Ap, 1]]))[0] === "Type<Apple>" ? "string" : "number")
const H = type(pick({ "Type<Apple>": "string" }) ?? "number")
const J = type({ [["a", "b"].join("")]: "string", ["abc".replace(/b/, "").split(/c/)[0]]: "string", ["x".replace("x", s => s + "y")]: "string" })
const K = type([Ap, Z].map(t => t).at(1)!)
const replacer = (k: string, v: any) => (k === "" ? { a: Ap } : k === "a" ? v.proto.includes("Apple") : v)
const M = type(JSON.stringify(0, replacer) === '{"a":true}' ? "string" : "number")`)
			).snap([
				"5:12 accepted Apple$hole_1c2w4i12760ad",
				"6:11 accepted Zebra$hole_tlxgt0061ywqu",
				'8:11 rejected\n  arktype calls `where` (/main.ts:8:102) while defining the type, so it must be a static helper\n  `[n].join("")` converts an object to a primitive, which runs its methods',
				'9:11 rejected\n  `[Ap, Z].join("")` converts an object to a primitive, which runs its methods',
				"10:11 rejected\n  `Object.fromEntries([[Ap, 1]])` converts an object to a primitive, which runs its methods",
				"11:11 rejected\n  `Ap as never` converts an object to a primitive, which runs its methods",
				"12:11 accepted { a: string, ab: string, xy: string }",
				"13:11 accepted Zebra$hole_tlxgt0061ywqu",
				"15:11 rejected\n  `v: any` (/main.ts:14:30) receives the name of `Apple` (/main.ts:3:1), which the build knows only by a placeholder"
			])
		})

		it("a callback over a long array", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const codes = "x".repeat(5000).split("").map((_, i) => \`c\${i}\`)
const Code = type.enumerated(...codes.map(c => c.toUpperCase()))`).map(status =>
					status.split(" ", 2).join(" ")
				)
			).snap(["3:14 accepted"])
		})

		it("results each engine computes its own way", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type({ ["ß".toUpperCase()]: "string" })
const B = type({ ["abc".toUpperCase()]: "string" })`)
			).snap([
				'2:11 rejected\n  `"ß".toUpperCase()` maps characters by the engine\'s Unicode version, which varies outside ASCII',
				"3:11 accepted { ABC: string }"
			])
		})

		it("environment", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type("Date").atOrAfter(Date.now())
const B = type(\`'\${process.argv[2]}'\`)
const C = type(\`number < \${Math.random()}\`)
const D = type(\`'\${(1000).toLocaleString()}'\`)
const E = type("Date").atOrAfter(new Date("2020-01-01T00:00:00"))`)
			).snap([
				"2:11 rejected\n  `Date.now` is not one of the build's pure built-ins",
				"3:11 rejected\n  `process` is a global the build does not read",
				"4:11 rejected\n  `Math.random` is not one of the build's pure built-ins",
				"5:11 rejected\n  `(1000).toLocaleString` is not one of the build's pure built-ins",
				'6:11 rejected\n  `new Date("2020-01-01T00:00:00")` reads the clock, the time zone or a format each engine parses its own way'
			])
		})

		it("approximated math", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type(\`number < \${2 ** 0.5}\`)`)
			).snap([
				"2:11 rejected\n  `2 ** 0.5` is approximated by each engine unless its operands are integers with a safe integer result"
			])
		})

		it("accessors and __proto__", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type({ get a() { return "string" } })
const B = type({ __proto__: null, a: "string" })`)
			).snap([
				'2:11 rejected\n  `get a() { return "string" }` is an accessor, which runs code when arktype reads the definition',
				"3:11 rejected\n  a `__proto__` key changes the object's prototype"
			])
		})

		it("reads that are not own data", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const limits = { max: 5 }
const A = type(\`'\${limits.toString}'\`)
const B = type(\`'\${limits.constructor.name}'\`)`)
			).snap([
				"3:11 rejected\n  `limits.toString` does not read an own data property",
				"4:11 rejected\n  `limits.constructor` does not read an own data property"
			])
		})

		it("object rest over a value other than an object literal", () => {
			attest(
				statusesOf(`import { scope, type } from "arktype"
const M = scope({ a: "string" }).export()
const count = ({ ...rest }: object) => Object.keys(rest).length
const A = type(count({ a: 1, b: 2 }) === 2 ? "string" : "number")
const B = type(count("ab" as never) === 2 ? "string" : "number")
const C = type(count(M) === 1 ? "string" : "number")`)
			).snap([
				"2:11 accepted",
				"4:11 accepted string",
				"5:11 rejected\n  `...rest` copies the rest of a value other than an object literal",
				"6:11 rejected\n  `...rest` copies the rest of a value other than an object literal"
			])
		})

		it("helper reached through a property", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const limits = { max: () => 5 }
const A = type(\`number < \${limits.max()}\`)`)
			).snap([
				"3:11 rejected\n  `limits.max` is a function reached through a property rather than a binding"
			])
		})

		it("sites over a rejected binding", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const T = type(\`string <= \${Date.now()}\`)
const U = T.or("number")
const V = T("data")`)
			).snap([
				"2:11 rejected\n  `Date.now` is not one of the build's pure built-ins"
			])
		})

		it("object another module does not export", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { max } from "./limits.ts"
const A = type(\`number < \${max()}\`)`,
					{
						"/limits.ts": `const limits = { max: 5 }\nexport const max = () => limits.max`
					}
				)
			).snap([
				"3:11 rejected\n  the site reads `limits` (/limits.ts:1:7), which its module cannot import, so the site cannot compare it at creation"
			])
		})

		it("introspection printing a function's placeholder", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const T = type("string").pipe(s => s.length)
const a = T.json`)
			).snap([
				"2:11 accepted (In: string) => Out<unknown>",
				"3:11 rejected\n  `T.json` (/main.ts:3:11) prints the name of a function (/main.ts:2:31), which the build knows only by a placeholder"
			])
		})

		it("excluded arktype members", () => {
			attest(
				statusesOf(`import { generic, scope, type } from "arktype"
const User = type({ name: "string" })
const A = type(\`'\${User.id}'\`)
const B = type(JSON.stringify(User.json))
const C = type(\`'\${JSON.stringify(User)}'\`)
const E = type(User.internal.hasKind("intersection") ? "string" : "number")
const $ = scope({ a: "string" })
const Gen = generic("t")(["t", "[]"])
const Self = type({ a: "string", "b?": "this" })
const H = type(\`'\${$.name}'\`)
const I = type(\`'\${Object.keys($.refsById).join("|")}'\`)
const K = type(\`'\${Self.internal.select({ kind: "alias" })[0].reference}'\`)
const M = type($.export().a)
const N = type(Gen.names.length === 1 ? "string" : "number")`)
			).snap([
				"2:14 accepted { name: string }",
				"3:11 rejected\n  `User.id` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"4:11 rejected\n  `User.json` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"5:11 rejected\n  `JSON.stringify(User)` stringifies a function or arktype value",
				"6:11 accepted string",
				"7:11 accepted",
				"8:13 accepted",
				"9:14 accepted { a: string, b?: this }",
				"10:11 rejected\n  `$.name` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"11:11 rejected\n  `$.refsById` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				'12:11 rejected\n  `Self.internal.select({ kind: "alias" })[0].reference` is not a documented member its content alone decides, so it can depend on registry names or node ids',
				"13:11 accepted string",
				"14:11 accepted string"
			])
		})

		it("match parser extended by separate cases", () => {
			attest(
				statusesOf(`import { match } from "arktype"
const parser = match.case("string", s => s.length)
parser.case("number", n => n)
const M = parser.default("assert")`)
			).snap([
				"2:16 accepted",
				"3:1 rejected\n  `parser` is a match parser, which each `.case` mutates, and is read in more than one place",
				"4:11 rejected\n  `parser` is a match parser, which each `.case` mutates, and is read in more than one place"
			])
		})
	})

	describe("parse errors", () => {
		const parseErrorsOf = (opts?: PrecompileOptions) =>
			analyze(
				`import { type } from "arktype"
const A = type({ a: "1" }).and({ a: "2" })`,
				{},
				opts
			).diagnostics.map(d => `${d.severity} ${renderDiagnostic(d)}`)

		it("fails", () => {
			attest(parseErrorsOf()).snap([
				'error /main.ts:2:11  type({ a: "1" }).and({ a: "2" }) throws a ParseError\n  Intersection at a of 1 and 2 results in an unsatisfiable type\n  Fix the definition, or it throws the same ParseError at runtime. Set allowUnsafe: true to build anyway, with a warning.'
			])
		})

		it("warns with allowUnsafe", () => {
			attest(parseErrorsOf({ allowUnsafe: true })).snap([
				'warning /main.ts:2:11  type({ a: "1" }).and({ a: "2" }) throws a ParseError\n  Intersection at a of 1 and 2 results in an unsatisfiable type\n  Fix the definition, or it throws the same ParseError at runtime.'
			])
		})

		it("fails with runtime arktype", () => {
			attest(parseErrorsOf({ runtime: "arktype" })).snap([
				'error /main.ts:2:11  type({ a: "1" }).and({ a: "2" }) throws a ParseError\n  Intersection at a of 1 and 2 results in an unsatisfiable type\n  Fix the definition, or it throws the same ParseError at runtime. Set allowUnsafe: true to build anyway, with a warning.'
			])
		})

		it("rejects other errors", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const read = (o: any) => o.a.b
const A = type(read({}))`)
			).snap([
				"3:11 rejected\n  `o.a.b` reads a property of undefined, which throws"
			])
		})
	})
})
