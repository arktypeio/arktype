import { attest, contextualize } from "@ark/attest"
import { diagnosticsOf, precompile, statusesOf } from "./utils.ts"

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
			const result = precompile(
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
				"11:45 accepted { id: string }[]",
				"13:21 accepted { id: string }[] <= 2"
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

		it("escaped objects are inputs", () => {
			const result = precompile(`import { type } from "arktype"
const unit = { a: 1 }
register(unit)
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
			const result = precompile(
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
			const result = precompile(`import { type } from "arktype"
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
					kind: "symbol",
					arity: undefined,
					description: "tag",
					isCalledAtDefinition: false,
					isDefinition: false
				}
			])
		})

		it("define constants", () => {
			const result = precompile(
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

		it("object that escapes a module that does not export it", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { max } from "./limits.ts"
const A = type(\`number < \${max()}\`)`,
					{
						"/limits.ts": `const limits = { max: 5 }\nregister(limits)\nexport const max = () => limits.max`
					}
				)
			).snap([
				"3:11 rejected\n  the site reads an object that escapes a module that does not export it\n  `limits` is passed to `register` (/limits.ts:2:1)"
			])
		})

		it("excluded arktype members", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const User = type({ name: "string" })
const A = type(\`'\${User.id}'\`)
const B = type(JSON.stringify(User.json))
const C = type(\`'\${JSON.stringify(User)}'\`)`)
			).snap([
				"2:14 accepted { name: string }",
				"3:11 rejected\n  `User.id` is derived from registry names or node ids, which are not stable",
				"4:11 rejected\n  `User.json` is derived from registry names or node ids, which are not stable",
				"5:11 rejected\n  `JSON.stringify(User)` stringifies a function or arktype value"
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
