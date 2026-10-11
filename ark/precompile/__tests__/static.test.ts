import { attest, contextualize } from "@ark/attest"
import { precompileModule, Precompiler } from "@ark/precompile"
import { analyze, diagnosticsOf, memoryHost, statusesOf } from "./utils.ts"

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
			).snap(["4:11 accepted number < 5 & > 1"])
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

		it("enums", () => {
			attest(
				statusesOf(`import { type } from "arktype"
enum Size { small = 1, large = small * 10 }
const enum Name { a = "alpha" }
const A = type(\`\${Size.small} < number < \${Size.large}\`)
const B = type(\`'\${Name.a}' | '\${Size[1]}'\`)`)
			).snap([
				"4:11 accepted number < 10 & > 1",
				'5:11 accepted "alpha" | "small"'
			])
		})

		it("interfaces extending a namespace's member", () => {
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
const B = type(\`'\${typeof max}' | '\${"a" in { a: 1 }}' | '\${null ?? max}'\`)
const C = type(\`number < \${Math.sin(0) + Math.sqrt(16)}\`)`)
			).snap([
				"3:11 accepted number < 1024",
				'4:11 accepted "5" | "number" | "true"',
				"5:11 accepted number < 4"
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
function optional(t) {
	return t.or("undefined")
}
const A = type(bound(twice(2)))
const B = optional(type(helpers.label("a")))`,
					{
						"/helpers.ts": `export const twice = (n: number) => n * 2\nexport const label = (s: string) => \`'\${s}'\``
					}
				)
			).snap(["8:11 accepted number < 4", '9:11 accepted "a" | undefined'])
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
const sized = (n: number) => Row.array().atMostLength(n)
export const Pair = sized(2)
export const handle = (input: unknown) => parseNames(input)`
			const files = {
				"/names.ts": `import { type } from "arktype"
export const parseNames = (data: unknown) => type("string[]")(data)`
			}
			attest(statusesOf(source, files)).snap([
				"3:13 accepted { id: string }",
				"8:55 accepted { id: string }[]",
				"13:45 accepted { id: string }[]",
				"15:21 accepted { id: string }[] <= 2"
			])
			attest(diagnosticsOf(source, files)).snap([])
		})

		it("helpers over types", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const optional = (t: any) => t.or("undefined")
const log = (t: unknown) => console.log(t)
const A = optional(type("string"))
log(type("number"))
const B = type("string")("data")`)
			).snap([
				"4:11 accepted string | undefined",
				"5:5 accepted number",
				"6:11 accepted string"
			])
		})

		it("Types helpers return, behind a cast or composed with a parameter", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type({ a: "string" })
const first = () => A
const make = (k: string) => first().and({ [k]: "number" })
const Cast = (first() as typeof A).and({ b: "number" })
const Asserted = first()!.or("null")
const Z = make("z")`)
			).snap([
				"2:11 accepted { a: string }",
				"5:14 accepted { a: string, b: number }",
				"6:18 accepted { a: string } | null",
				"7:11 accepted { a: string, z: number }"
			])
		})

		it("a Type a helper returns, whichever site asks first", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type({ a: "string" })
const First = f().or("string")
function k(useQ: boolean) {
	return useQ ? Q.and({ c: "number" }) : A.and({ b: "number" })
}
function f() {
	return k(false).and({ d: "number" })
}
const Q = f().or("null")
const R = Q.or("undefined")`)
			).snap([
				"2:11 accepted { a: string }",
				"3:15 accepted string | { a: string, b: number, d: number }",
				"5:16 accepted { a: string, b: number, c: number, d: number }",
				"5:41 accepted { a: string, b: number }",
				"8:9 accepted { a: string, b: number, d: number }",
				"10:11 accepted { a: string, b: number, d: number } | null",
				"11:11 accepted { a: string, b: number, d: number } | undefined | null"
			])
		})

		it("members a standalone validator has are read at runtime", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type({ a: "string" })
const label = () => A.description
const L = A.description
const make = (k: string) => A.and({ [k]: "number" })
const upper = label().toUpperCase() + L.toUpperCase()
const E = make("z").expression
const S = A.toString()`)
			).snap([
				"2:11 accepted { a: string }",
				"7:11 accepted { a: string, z: number }"
			])
		})

		it("members a standalone validator lacks are sites", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const T = type({ a: "string.trim" })
const I = T.in
const label = () => T.out.expression`)
			).snap([
				"2:11 accepted { a: (In: string) => Out</^\\S.*\\S$|^\\S?$/> }",
				"3:11 accepted { a: string }",
				"4:21 accepted { a: /^\\S.*\\S$|^\\S?$/ }"
			])
		})

		it("Types read through namespaces, object literals and default exports", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import * as schemas from "./schemas.ts"
import Default from "./default.ts"
import make from "./make.ts"
const local = { User: type({ name: "string" }) }
const A = schemas.User.or("null")
const B = local.User.or("null")
const C = Default.or("null")
const D = make().or("null")`,
					{
						"/schemas.ts": `import { type } from "arktype"\nexport const User = type({ id: "string" })`,
						"/default.ts": `import { type } from "arktype"\nexport default type({ d: "string" })`,
						"/make.ts": `import { type } from "arktype"\nconst M = type({ m: "string" })\nexport default () => M`
					}
				)
			).snap([
				"5:23 accepted { name: string }",
				"6:11 accepted { id: string } | null",
				"7:11 accepted { name: string } | null",
				"8:11 accepted { d: string } | null",
				"9:11 accepted { m: string } | null"
			])
		})

		it("Types held in object literals and arrays, read however the build can", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { schemas } from "./schemas.ts"
const local = { users: { User: type({ name: "string" }) }, list: [type("string")] }
const forms = () => ({ create: type({ title: "string" }) })
const key = "users"
const A = schemas.User.or("null")
const B = local[key].User.or("null")
const C = local.list[0].array()
const D = forms().create.or("null")`,
					{
						"/schemas.ts": `import { type } from "arktype"\nconst User = type({ id: "string" })\nexport const schemas = { User }`
					}
				)
			).snap([
				"3:32 accepted { name: string }",
				"3:67 accepted string",
				"4:32 accepted { title: string }",
				"6:11 accepted { id: string } | null",
				"7:11 accepted { name: string } | null",
				"8:11 accepted string[]",
				"9:11 accepted { title: string } | null"
			])
		})

		it("a Type passed to a helper the build can't interpret", () => {
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

		it("each Type passed to one call of a helper the build can't interpret", () => {
			attest(
				statusesOf(`import { type } from "arktype"
import { router } from "some-router"
const route = (input: unknown, output: unknown) => router.register(input, output)
export const getUser = route(type({ id: "string" }), type({ name: "string" }))`)
			).snap(["4:30 accepted { id: string }", "4:54 accepted { name: string }"])
		})

		it("Types a static helper composes from its parameter, also through another helper", () => {
			attest(
				statusesOf(`import { type, type Type } from "arktype"
const A = type({ a: "string" })
const withId = <t extends object>(t: Type<t>) => t.and({ id: "string" })
const make = (k: string) => A.and({ [k]: "number" })
const make2 = (k: string) => make(k)
const B = withId(A).partial()
const Z = make2("z").or("null")`)
			).snap([
				"2:11 accepted { a: string }",
				"6:11 accepted { a?: string, id?: string }",
				"7:11 accepted { a: string, z: number } | null"
			])
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
					`import { type, regex, byAncestorPath, byPath, flatByPath, flatProblemsByPath, messageIn } from "arktype"
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
	return [flatProblemsByPath(out), flatByPath(out), byPath(out), byAncestorPath(out), messageIn(out.issues[0], {} as never)]
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
					...site.holes.map(hole => `${hole.kind} ${hole.start}:${hole.end}`),
					...site.inputs.map(input => `${input.kind} ${input.name}`)
				])
			).snap([["accepted", "function 163:167", "import max"]])
		})

		it("dates", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type("Date").atOrAfter(new Date(0))
const B = type("Date").atOrAfter(Date.UTC(2020, 0, 1))
const C = type("Date").atOrAfter(new Date("2020-01-01"))
const D = type("Date").atOrAfter(new Date("2020-01-01T00:00:00+02:00"))`)
			).snap([
				"2:11 accepted Date >= d'1970-01-01T00:00:00.000Z'",
				"3:11 accepted Date >= d'2020-01-01T00:00:00.000Z'",
				"4:11 accepted Date >= d'2020-01-01T00:00:00.000Z'",
				"5:11 accepted Date >= d'2019-12-31T22:00:00.000Z'"
			])
		})

		it("regexes and symbols", () => {
			const result = analyze(`import { type } from "arktype"
const tag = Symbol("tag")
const A = type("string").matching(new RegExp("^a", "i"))
const B = type({ [tag]: "string" })`)
			attest(result.sites.map(site => site.status)).snap([
				"accepted",
				"accepted"
			])
			attest(result.sites[1].holes).snap([
				{
					file: "/main.ts",
					start: 132,
					end: 135,
					value: "Symbol(tag)",
					kind: "symbol",
					arity: undefined,
					description: "tag",
					isCalledAtDefinition: false,
					isDefinition: false,
					isParameter: false
				}
			])
		})

		it("define constants", () => {
			const result = analyze(
				`import { type } from "arktype"
const A = type(process.env.NODE_ENV === "production" ? "string" : "unknown")
const B = type(\`'\${import.meta.env.MODE}'\`)`,
				{},
				{
					define: {
						"process.env.NODE_ENV": "production",
						"import.meta.env.MODE": "dev"
					}
				}
			)
			attest(result.sites.map(site => site.status)).snap([
				"accepted",
				"accepted"
			])
			attest(result.sites.map(site => site.inputs)).snap([
				[
					{
						kind: "define",
						file: undefined,
						name: "process.env.NODE_ENV",
						path: [],
						value: "production"
					}
				],
				[
					{
						kind: "define",
						file: undefined,
						name: "import.meta.env.MODE",
						path: [],
						value: "dev"
					}
				]
			])
		})

		it("a Type's introspection at a site of its own", () => {
			const source = `import { type } from "arktype"
import { User } from "./user.ts"
const T = type({ a: "string" })
const a = T.json
const b = T.toJSON()
const c = T.toJsonSchema({ target: "draft-07" })
const d = User.json`
			const files = {
				"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
			}
			attest(statusesOf(source, files)).snap([
				"3:11 accepted { a: string }",
				"4:11 accepted",
				"5:11 accepted",
				"6:11 accepted",
				"7:11 accepted"
			])
			// a bundler drops User's module with the last export read from it, whatever else the module runs
			const { sites } = analyze(source, files)
			attest(
				sites[sites.length - 1].inputs.map(input => [input.name, input.path])
			).equals([["User", []]])
			// arktype computes it at runtime from the Type a site created
			attest(statusesOf(source, files, { runtime: "arktype" })).snap([
				"3:11 accepted { a: string }"
			])
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
				'/main.ts:4:32  `schema` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `schema` is a parameter of wrap (/main.ts:3:15); its value is known only at runtime\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:7:24  `z.string()` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `zod` is a package the build does not read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
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

		it("receives what an import cycle can reach before its declaration", () => {
			const files = {
				"/items.ts": `import { type } from "arktype"
import "./main.ts"
const M = type.module({ a: "number" })
export const N = type.module({ a: "string" })
export function member() { return M.a }
export function exported() { return N.a }
export const arrow = () => N.a`
			}
			const { sites } = analyze(
				`import { type } from "arktype"
import { arrow, exported, member } from "./items.ts"
export function make() { return T.or("null") }
const T = type("string")
export const A = member()
export const B = exported()
export const C = arrow()
export const D = later()
const later = () => N.a
import { N } from "./items.ts"`,
				files
			)
			attest(
				sites.map(site =>
					[
						`${site.line}:${site.column} ${site.status}`,
						...site.reasons,
						...site.inputs.map(
							input => `${input.kind} ${[input.name, ...input.path].join(".")}`
						)
					].join("\n  ")
				)
			).snap([
				"3:33 accepted\n  local T",
				"4:11 accepted",
				"5:18 rejected\n  `member` reads `M` (/items.ts:3:7), which an import cycle can reach before its declaration runs; export `M` so the site can receive it",
				"6:18 accepted\n  import N.a\n  import exported",
				"7:18 accepted\n  import arrow",
				"8:18 accepted\n  local later\n  import N.a"
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
				'3:12 rejected\n  `type("string").and(type.unit(v))` reads the structure of `v`, which is not static\n  `v` is a parameter of make (/main.ts:2:22); its value is known only at runtime',
				"4:12 rejected\n  `type.string.atMostLength(n)` reads the structure of `n`, which is not static\n  `n` is a parameter of make (/main.ts:2:34); its value is known only at runtime",
				"5:12 accepted string",
				"6:12 rejected\n  arktype holds `v` as a value rather than a definition, so it must be static\n  `v` is a parameter of make (/main.ts:2:22); its value is known only at runtime",
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

		it("a Type passed to a function that isn't a static helper", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const T = type({ a: "string" })
function nullable(t: typeof T) {
	const n = t.or("null")
	return n
}
export const X = nullable(T)`)
			).snap([
				'/main.ts:4:12  t.or reads or, which a standalone validator lacks\n  `t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("Types read through a computed key, a parameter's default or a superclass", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
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
				'/main.ts:4:9  [k]: I reflects on a Type, whose properties a standalone validator doesn\'t share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:5:14  in: J reads in, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:11:11  D.User.or reads or, which a standalone validator lacks\n  `D.User` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("a Type a getter returns", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
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
				'/main.ts:12:18  schemas.User.or reads or, which a standalone validator lacks\n  `schemas.User` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:13:18  Forms.Admin.or reads or, which a standalone validator lacks\n  `Forms.Admin` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("a Type iterated from an array or returned by an object literal's method", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const forms = {
	make() {
		return type("string")
	}
}
for (const t of [type("number")]) console.log(t.or("null"))
export const X = forms.make().or("null")`)
			).snap([
				'/main.ts:7:47  t.or reads or, which a standalone validator lacks\n  `t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:8:18  forms.make().or reads or, which a standalone validator lacks\n  `forms.make()` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("members a standalone validator lacks, read outside any site", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const T = type({ a: "string" })
const jsonOf = (t: typeof T) => t.json
console.log(T.expression, T.toString(), Object.is(T, T))
console.log(jsonOf(T), "json" in T, JSON.stringify(T))`)
			).snap([
				'/main.ts:3:33  t.json reads json, which a standalone validator lacks\n  `t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:5:24  "json" in T reads json, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:5:37  JSON.stringify(T) reads toJSON, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("members a build's introspection option bakes", () => {
			const source = `import { type } from "arktype"
const T = type({ a: "string" })
const jsonOf = (t: typeof T) => t.json
console.log(jsonOf(T), "json" in T, JSON.stringify(T), T.toJSON)`
			attest(
				diagnosticsOf(source, {}, { introspection: ["json", "toJSON"] })
			).equals([])
			attest(
				diagnosticsOf(source, {}, { introspection: ["toJSON"] }).map(
					diagnostic => diagnostic.split("\n")[0]
				)
			).snap([
				"/main.ts:3:33  t.json reads json, which a standalone validator lacks",
				'/main.ts:4:24  "json" in T reads json, which a standalone validator lacks'
			])
			attest(
				() =>
					new Precompiler(memoryHost({}), {
						introspection: ["json", "and" as never]
					})
			).throws.snap(
				'Error: introspection lists "and", which isn\'t one of "json", "toJSON", "toJsonSchema", "~standard.jsonSchema"'
			)
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
				'/main.ts:4:22  ...rest reflects on a Type, whose properties a standalone validator doesn\'t share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:5:1  for (const k in T) console.log(k) reflects on a Type, whose properties a standalone validator doesn\'t share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("packages that read arktype's nodes outside a runtime island", () => {
			attest(
				diagnosticsOf(`import { discriminantJsonOf } from "arksets"
import { ArkErrors, hasArkKind } from "@ark/schema"
import { type } from "arktype"
const T = type({ a: "0" }).or({ a: "1" })
const check = (f: () => void) => f()
check(() => console.log(discriminantJsonOf(T as never), hasArkKind(T, "root")))
console.log(T({}) instanceof ArkErrors)
// @ark-runtime
const D = discriminantJsonOf(type({ a: "0" }).or({ a: "1" }).internal as never)`)
			).snap([
				'/main.ts:6:25  `discriminantJsonOf` is used outside a runtime island\n  arksets reads the nodes arktype creates, which a standalone build replaces with validators\n  Read arktype\'s nodes in a definition marked // @ark-runtime, or build with runtime: "arktype".',
				'/main.ts:6:57  `hasArkKind` is used outside a runtime island\n  @ark/schema reads the nodes arktype creates, which a standalone build replaces with validators\n  Read arktype\'s nodes in a definition marked // @ark-runtime, or build with runtime: "arktype".'
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

		it("identity of arktype values", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type(type("string") === type("string") ? "number" : "boolean")
const B = type([type("string")].includes(type("string")) ? "number" : "boolean")`)
			).snap([
				'2:11 rejected\n  `type("string") === type("string")` compares arktype values by identity, which is unspecified',
				'3:11 rejected\n  `[type("string")].includes(type("string"))` compares an arktype value by identity, which is unspecified'
			])
		})

		it("dates each engine parses its own way", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type("Date").atOrAfter(new Date("2019-02-31"))
const B = type("Date").atOrAfter(new Date("2020-01-01T24:00Z"))
const C = type("Date").atOrAfter(new Date("-000000-01-01"))`)
			).snap([
				'2:11 rejected\n  `new Date("2019-02-31")` reads the time zone, or a format each engine parses its own way',
				'3:11 rejected\n  `new Date("2020-01-01T24:00Z")` reads the time zone, or a format each engine parses its own way',
				'4:11 rejected\n  `new Date("-000000-01-01")` reads the time zone, or a format each engine parses its own way'
			])
		})

		it("built-ins that write", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const o = { a: "string" }
const set = (x: any) => Object.assign(x, { a: "number" })
export const A = type(o)
export const B = type(set(o).a)
export const C = type(Object.freeze(o).a)
export const D = type(Object.assign({}, o, { b: "number" }))
export const E = type(Object.freeze({ a: "string" }))`)
			).snap([
				"4:18 accepted { a: string }",
				'5:18 rejected\n  `Object.assign(x, { a: "number" })` writes to an object other than a new object or array literal',
				"6:18 rejected\n  `Object.freeze(o)` writes to an object other than a new object or array literal",
				"7:18 accepted { a: string, b: number }",
				"8:18 accepted { a: string }"
			])
		})

		it("a function's name defined as esbuild's keepNames defines it", () => {
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
const field = __name((n: number) => type(\`string <= \${n}\`), "field")
function list(t: string) { return type(\`\${t}[]\`) }
__name(list, "list")
export const A = field(5)
export const B = list("number")`)
			).snap(["7:18 accepted string <= 5", "8:18 accepted number[]"])
		})

		it("static helpers a minified keepNames names", () => {
			attest(
				statusesOf(`import { type as o } from "arktype"
var i=Object.defineProperty;var e=(n,s)=>i(n,"name",{value:s,configurable:!0});
function r(n){return o({a:o("number").atLeast(n)})}e(r,"field");
export const a=r(5)`)
			).snap(["4:16 accepted { a: number >= 5 }"])
			attest(
				statusesOf(`import { type as o } from "arktype"
var i=Object.defineProperty;var e=(n,s)=>i(n,"name",{value:s,configurable:!1});
function r(n){return o({a:o("number").atLeast(n)})}e(r,"field");
export const a=r(5)`)
			).snap([
				'3:22 rejected\n  `o("number").atLeast(n)` reads the structure of `n`, which is not static\n  `n` is a parameter of r (/main.ts:3:12); its value is known only at runtime',
				"4:16 accepted { a: number >= 5 }"
			])
		})

		it("a helper exported by a clause", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const field = (n: number) => type(\`string <= \${n}\`)
export const A = field(5)
export { field }`)
			).snap(["3:18 accepted string <= 5"])
		})

		it("a helper whose keepNames name is passed on", () => {
			attest(
				statusesOf(`import { type } from "arktype"
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, "name", { value, configurable: true })
function list(t: string) { return type(\`\${t}[]\`) }
const alias = __name(list, "list")
export const B = list("number")
export const make = (t: string) => alias(t)`)
			).snap([
				"4:35 rejected\n  `t` is a parameter of list (/main.ts:4:15); its value is known only at runtime",
				"6:18 accepted number[]"
			])
		})

		it("a helper another module passes on", () => {
			attest(
				diagnosticsOf(
					`import { field, list, double } from "./helpers.ts"
export const [A] = [5].map(field)
export const B = [5].map(list)
export const C = field(5)
export const D = [5].map(double)
export { field }`,
					{
						"/helpers.ts": `import { type } from "arktype"
const field = (n: number) => type({ a: type("number").atLeast(n) })
export const list = (n: number) => type({ a: type("number").atLeast(n) }).array()
export const double = (n: number) => n * 2
export { field }`
					}
				)
			).snap([
				'/main.ts:2:28  `field` is a helper the build folds at each call, so passing it runs its definition at runtime\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
				'/main.ts:3:26  `list` is a helper the build folds at each call, so passing it runs its definition at runtime\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("a helper named by other than esbuild's keepNames helper", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const Object = { defineProperty: (target: any) => () => "string" }
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, "name", { value, configurable: true })
const field = __name((n: number) => type(\`string <= \${n}\`), "field")
export const A = field(5)`)
			).snap([
				"5:37 rejected\n  `n` is a parameter of a function (/main.ts:5:23); its value is known only at runtime"
			])
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
const first = (a: object, b: object) => [a, b].toSorted()[0]
const pick = ({ [Ap as never]: v }: Record<string, string>) => v
const A = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => [n].join("").includes("isLong") })
const B = type([Ap, Z].join("") === "Type<Apple>Type<Zebra>" ? "string" : "number")
const C = type("".concat(Ap as never) === "Type<Apple>" ? "string" : "number")
const D = type(Object.keys(Object.fromEntries([[Ap, 1]]))[0] === "Type<Apple>" ? "string" : "number")
const E = type(first(Z, Ap) as never)
const F = type(Symbol.for(Ap as never) === Symbol.for("Type<Apple>") ? "string" : "number")
const G = type(String.raw({ raw: ["", ""] }, Ap) === "Type<Apple>" ? "string" : "number")
const H = type(pick({ "Type<Apple>": "string" }) ?? "number")
const I = type("Type<Apple>".replace(Ap as never, "") === "" ? "string" : "number")
const J = type({ [["a", "b"].join("")]: "string", ["abc".replace(/b/, "").split(/c/)[0]]: "string", ["x".replace("x", s => s + "y")]: "string" })
const K = type(Array.of(Ap, Z).map(t => t).toReversed()[1])
const L = type("Type<Apple>".split(new RegExp(Ap as never)).length === 2 ? "string" : "number")
const replacer = (k: string, v: any) => (k === "" ? { a: Ap } : k === "a" ? v.proto.includes("Apple") : v)
const M = type(JSON.stringify(0, replacer) === '{"a":true}' ? "string" : "number")`)
			).snap([
				"5:12 accepted Apple$hole_1c2w4i12760ad",
				"6:11 accepted Zebra$hole_tlxgt0061ywqu",
				'9:11 rejected\n  arktype calls `where` (/main.ts:9:102) while defining the type, so it must be a static helper\n  `[n].join("")` converts an object to a primitive, which runs its methods',
				'10:11 rejected\n  `[Ap, Z].join("")` converts an object to a primitive, which runs its methods',
				'11:11 rejected\n  `"".concat(Ap as never)` converts an object to a primitive, which runs its methods',
				"12:11 rejected\n  `Object.fromEntries([[Ap, 1]])` converts an object to a primitive, which runs its methods",
				"13:11 rejected\n  `[a, b].toSorted()` converts an object to a primitive, which runs its methods",
				"14:11 rejected\n  `Symbol.for(Ap as never)` converts an object to a primitive, which runs its methods",
				'15:11 rejected\n  `String.raw({ raw: ["", ""] }, Ap)` converts an object to a primitive, which runs its methods',
				"16:11 rejected\n  `Ap as never` converts an object to a primitive, which runs its methods",
				'17:11 rejected\n  `"Type<Apple>".replace(Ap as never, "")` converts an object to a primitive, which runs its methods',
				"18:11 accepted { a: string, ab: string, xy: string }",
				"19:11 accepted Apple$hole_1c2w4i12760ad",
				"20:11 rejected\n  `new RegExp(Ap as never)` converts an object to a primitive, which runs its methods",
				"22:11 rejected\n  `v: any` (/main.ts:21:30) receives the name of `Apple` (/main.ts:3:1), which the build knows only by a placeholder"
			])
		})

		it("a callback receiving a placeholder from a built-in, in its own module", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { replacer } from "./replacer.ts"
const J = type(JSON.stringify(0, replacer) === '{"a":true}' ? "string" : "number")`,
					{
						"/replacer.ts": `import { type } from "arktype"
class Apple {}
const Ap = type.instanceOf(Apple)
export const replacer = (k: string, v: any) => (k === "" ? { a: Ap } : k === "a" ? v.proto.includes("Apple") : v)`
					}
				)
			).snap([
				"3:11 rejected\n  `v: any` (/replacer.ts:4:37) receives the name of `Apple` (/replacer.ts:2:1), which the build knows only by a placeholder"
			])
		})

		it("a callback over a long array, whose elements it admits once", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const codes = Array.from({ length: 5000 }, (_, i) => \`c\${i}\`)
const Code = type.enumerated(...codes.map(c => c.toUpperCase()))`).map(status =>
					status.split(" ", 2).join(" ")
				)
			).snap(["3:14 accepted"])
		})

		it("results each engine computes its own way", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type({ [["b", "a"].toSorted((l, r) => (l < r ? -1 : 1))[0]]: "string" })
const B = type({ [["b", "a"].toSorted()[0]]: "string" })
const C = type({ ["ß".toUpperCase()]: "string" })
const D = type({ ["abc".toUpperCase()]: "string" })`)
			).snap([
				'2:11 rejected\n  `["b", "a"].toSorted((l, r) => (l < r ? -1 : 1))` sorts by a comparator, whose order the spec leaves to each engine unless it is consistent',
				"3:11 accepted { a: string }",
				'4:11 rejected\n  `"ß".toUpperCase()` maps characters by the engine\'s Unicode version, which varies outside ASCII',
				"5:11 accepted { ABC: string }"
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
				'6:11 rejected\n  `new Date("2020-01-01T00:00:00")` reads the time zone, or a format each engine parses its own way'
			])
		})

		it("approximated math", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type(\`number < \${2 ** 0.5}\`)
const B = type(\`number < \${Math.sin(1)}\`)`)
			).snap([
				"2:11 rejected\n  `2 ** 0.5` is approximated by each engine unless its operands are integers with a safe integer result",
				"3:11 rejected\n  `Math.sin(1)` is approximated by each engine unless its operands are integers with a safe integer result"
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

		it("type built from a type that is not static", () => {
			attest(
				statusesOf(`import { type } from "arktype"
let Inner = type("string")
Inner = type("number")
const A = type({ inner: Inner })`)
			).snap([
				"2:13 accepted string",
				"3:9 accepted number",
				"4:11 rejected\n  `Inner` is a Type assigned at /main.ts:3:1, so it is not static"
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
const D = type(\`'\${User.internal.trackedId}'\`)
const E = type(User.internal.hasKind("intersection") ? "string" : "number")
const F = type(User.internal.assertHasKind("intersection").inner.domain?.kind === "domain" ? "string" : "number")
const G = type(User.internal.assertHasKind("intersection").structure?.kind === "structure" ? "string" : "number")
const $ = scope({ a: "string" })
const Gen = generic("t")(["t", "[]"])
const Self = type({ a: "string", "b?": "this" })
const H = type(\`'\${$.name}'\`)
const I = type(\`'\${Object.keys($.referencesById).join("|")}'\`)
const J = type(\`'\${Object.keys(Gen.internal.referencesById).join("|")}'\`)
const K = type(\`'\${Self.internal.select({ kind: "alias" })[0].reference}'\`)
const L = type(\`'\${Self.internal.select({ kind: "alias" })[0].inner.reference}'\`)
const M = type($.export().a)
const N = type(Gen.names.length === 1 ? "string" : "number")`)
			).snap([
				"2:14 accepted { name: string }",
				"3:11 rejected\n  `User.id` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"4:11 rejected\n  `User.json` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"5:11 rejected\n  `JSON.stringify(User)` stringifies a function or arktype value",
				"6:11 rejected\n  `User.internal.trackedId` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"7:11 accepted string",
				"8:11 accepted string",
				"9:11 accepted string",
				"10:11 accepted",
				"11:13 accepted",
				"12:14 accepted { a: string, b?: this }",
				"13:11 rejected\n  `$.name` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"14:11 rejected\n  `$.referencesById` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"15:11 rejected\n  `Gen.internal.referencesById` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				'16:11 rejected\n  `Self.internal.select({ kind: "alias" })[0].reference` is not a documented member its content alone decides, so it can depend on registry names or node ids',
				'17:11 rejected\n  `Self.internal.select({ kind: "alias" })[0].inner` is not a documented member its content alone decides, so it can depend on registry names or node ids',
				"18:11 accepted string",
				"19:11 accepted string"
			])
		})

		it("eval and with", () => {
			attest(
				[
					`eval("o.a = 'number'")`,
					`;(eval as any)("o.a = 'number'")`,
					`eval!("o.a = 'number'")`
				].map(
					use =>
						statusesOf(`import { type } from "arktype"
const o = { a: "string" }
${use}
export const T = type(o.a)`)[0]
				)
			).snap([
				"4:18 rejected\n  `o` is in a module that calls `eval`",
				"4:18 rejected\n  `o` is in a module that calls `eval`",
				"4:18 rejected\n  `o` is in a module that calls `eval`"
			])
			const source = `import { type } from "arktype"
const o = { a: "string" }
with ({ o: { a: "number" } }) { exports.T = type(o.a) }`
			attest(
				new Precompiler(memoryHost({ "/main.cts": source }))
					.analyze(source, "/main.cts")
					.sites.map(site => [site.status, ...site.reasons])
			).snap([["rejected", "`o` is in a module that uses `with`"]])
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
		it("warns and accepts", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const A = type({ a: "strin" })`)
			).snap([
				"/main.ts:2:11  type({ a: \"strin\" }) throws a ParseError\n  'strin' is unresolvable\n  The precompiled site throws the same ParseError when it is created."
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
