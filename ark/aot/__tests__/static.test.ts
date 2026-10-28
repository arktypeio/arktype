import { attest, contextualize } from "@ark/attest"
import { Precompiler, renderDiagnostic, type PrecompileOptions } from "@ark/aot"
import { writeArktypeRuntimeOptionMessage } from "@ark/aot/internal/settings.ts"
import {
	analyze,
	diagnosticsOf,
	memoryHost,
	precompile,
	statusesOf
} from "./utils.ts"

// a diagnostic without its hint, where the reason is the behavior
const unhinted = (...args: Parameters<typeof diagnosticsOf>) =>
	diagnosticsOf(...args).map(d => d.slice(0, d.lastIndexOf("\n")))

// where a Scope or Generic is refused, as passed to code the build can't see
// or, where its read names what it lacks, as read off a value it can't follow
const escapesOf = (...args: Parameters<typeof analyze>) =>
	analyze(...args).diagnostics.map(({ line, column, reasons: [reason] }) =>
		[
			`${line}:${column}`,
			/Generic/.test(reason) && "Generic",
			/lacks `(\w+)`/.exec(reason)?.[1]
		]
			.filter(Boolean)
			.join(" ")
	)

contextualize(() => {
	describe("allowed", () => {
		it("web platform classes Node has, but not the DOM's", () => {
			attest(
				statusesOf(`import { type } from "arktype"
export const Key = type.instanceOf(CryptoKey).or("null")
export const Upload = type({ body: type.instanceOf(ReadableStream), signal: type.instanceOf(AbortSignal), query: type.instanceOf(URLSearchParams) })
export const Socket = type.instanceOf(WebSocket)
export const Element = type.instanceOf(HTMLElement)`)
			).snap([
				"2:20 accepted CryptoKey | null",
				"3:23 accepted { body: ReadableStream, query: URLSearchParams, signal: AbortSignal }",
				"4:23 accepted WebSocket",
				"5:24 rejected\n  `HTMLElement` is a global the build does not read"
			])
		})

		it("static expressions", () => {
			attest(
				statusesOf(`import { type } from "arktype"
let max = 5
var min = 1
const key = "b"
const base = { a: "string" }
const rest = ["number"] as const
const limits = { max: 5, names: ["a", "b"] }
const roles = { admin: 1, member: 2 }
const tag = Symbol("tag")
const o: { a?: { b: string }; f?: () => string } = {}
enum Size { small = 1, large = small * 10 }
const enum Name { a = "alpha" }
declare namespace ns {
	interface base {}
}
interface extended extends ns.base {}
const A = type(\`number < \${0.1 + 0.2}\`)
const B = type({ a: "number" } as const satisfies object)
const C = type(<const>["string", ...rest])
const D = type({ ...base, [key]: "number", [\`\${key}2\`]: "boolean" })
const E = type(\`\${min} < number < \${max > 3 ? 2 ** 10 : -1}\`)
const F = type(\`'\${typeof max}' | '\${"a" in { a: 1 }}' | '\${null ?? max}'\`)
const G = type(\`number < \${limits.max + limits.names.length + "abc".length}\`)
const H = type(\`'\${limits.names[1]}' | '\${Name.a}' | '\${Size[1]}'\`)
const I = type(\`\${Size.small} < number < \${Size.large}\`)
const J = type(o?.a?.b ?? "string")
const K = type(o.f?.() ?? "number")
const L = type(Object.keys(roles).map(k => \`'\${k}'\`).join(" | "))
const M = type(\`number < \${Math.max(1, Number("2"), parseInt("3"))}\`)
const N = type(JSON.parse(JSON.stringify({ a: "string" })))
const P = type("string".toUpperCase().toLowerCase())
const Q = type("Date").atOrAfter(new Date(0))
const R = type("string").matching(new RegExp("^a", "i"))
const S = type({ [tag]: "string" })`)
			).snap([
				"17:11 accepted number < 0.30000000000000004",
				"18:11 accepted { a: number }",
				"19:11 accepted [string, number]",
				"20:11 accepted { a: string, b: number, b2: boolean }",
				"21:11 accepted 1 < number < 1024",
				'22:11 accepted "5" | "number" | "true"',
				"23:11 accepted number < 10",
				'24:11 accepted "alpha" | "b" | "small"',
				"25:11 accepted 1 < number < 10",
				"26:11 accepted string",
				"27:11 accepted number",
				'28:11 accepted "admin" | "member"',
				"29:11 accepted number < 3",
				"30:11 accepted { a: string }",
				"31:11 accepted string",
				"32:11 accepted Date >= d'1970-01-01T00:00:00.000Z'",
				"33:11 accepted /^a/i",
				"34:11 accepted { Symbol(tag): string }"
			])
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
				ark: { aot: true }
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
						'lib imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws. Where it defines its Types statically, precompile it with this in ark.json (or package.json\'s "ark" key):\n  "precompile": { "dependencies": { "lib": "aot" } }\nWhere it defines them from values known only at runtime, as from a database table, set "arktype" in place of "aot" to run it on arktype.'
					],
					warnings: []
				}
			])
		})

		it("static helpers", () => {
			attest(
				statusesOf(
					`import { type, scope } from "arktype"
import { twice } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const bound = (n: number) => \`number < \${n}\`
function h(this: void, def: string) { return def }
const A = type(bound(twice(2)))
const B = type(helpers.label("a"))
const C = type(h("string"))
const $ = scope({ a: function (this: void) { return "string" } as any }).export()`,
					{
						"/helpers.ts": `export const twice = (n: number) => n * 2\nexport const label = (s: string) => \`'\${s}'\``
					}
				)
			).snap([
				"6:11 accepted number < 4",
				'7:11 accepted "a"',
				"8:11 accepted string",
				"9:11 accepted"
			])
			// as esbuild's keepNames names them, formatted or minified
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
			attest(
				statusesOf(`import { type as o } from "arktype"
var i=Object.defineProperty;var e=(n,s)=>i(n,"name",{value:s,configurable:!0});
function r(n){return{a:"number >= "+n}}e(r,"field");
export const a=o(r(5))`)
			).snap(["4:16 accepted { a: number >= 5 }"])
		})

		it("Types held in namespaces and literals", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import * as schemas from "./schemas.ts"
import { held } from "./schemas.ts"
import Default from "./default.ts"
const local = { users: { User: type({ name: "string" }) }, list: [type("string")] }
const key = "users"
const F = local.users.User.or("null")
const A = schemas.User.or("null")
const B = held.User.or("null")
const C = local[key].User.or("null")
const D = local.list[0].array()
const E = Default.or("null")`,
					{
						"/schemas.ts": `import { type } from "arktype"\nexport const User = type({ id: "string" })\nexport const held = { User }`,
						"/default.ts": `import { type } from "arktype"\nexport default type({ d: "string" })`
					}
				)
			).snap([
				"5:32 accepted { name: string }",
				"5:67 accepted string",
				"7:11 accepted { name: string } | null",
				"8:11 accepted { id: string } | null",
				"9:11 accepted { id: string } | null",
				"10:11 accepted { name: string } | null",
				"11:11 accepted string[]",
				"12:11 accepted { d: string } | null"
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

		it("data validated by a Module's Type", () => {
			attest(
				diagnosticsOf(`import { scope, type } from "arktype"
const nested = type.module({ Line: { sku: "string" } })
const shop = scope({
	Id: "string",
	Cart: { owner: "Id", items: "string[]" },
	nested,
	"Box<t>": { of: "t" }
}).export()
const { Cart } = shop
export const upper = (data: unknown) =>
	shop.Cart.assert(data).items.map(i => i.toUpperCase())
export const messages = (data: unknown) => {
	const out = Cart(data)
	return out instanceof type.errors ? out.issues.map(i => i.message) : out.items.filter(Boolean)
}
export const skus = (data: unknown[]) =>
	shop.nested.Line.array().assert(data).map(line => line.sku)`)
			).equals([])
		})

		it("a Scope's thunks, whether or not an importer resolved them first", () => {
			const scoped = `import { scope } from "arktype"
export const $ = scope({
	topic: ["string", ":", s => s.length > 0],
	Post: { body: "string", "replies?": () => $.type("Post[]") }
})
export const Post = $.export().Post`
			const files = {
				"/scoped.ts": scoped,
				"/main.ts": 'import { Post } from "./scoped.ts"\nPost({ body: "a" })'
			}
			const alone = new Precompiler(memoryHost(files)).precompile(
				scoped,
				"/scoped.ts"
			)
			const afterImporter = new Precompiler(memoryHost(files))
			afterImporter.analyzeSites(files["/main.ts"], "/main.ts")
			attest(alone.diagnostics).equals([])
			attest(afterImporter.precompile(scoped, "/scoped.ts").modules).equals(
				alone.modules
			)
		})

		it("what a Generic's instantiation validates", () => {
			const source = `import { generic, scope, type } from "arktype"
const Page = generic("t")({ items: "t[]", total: "number" })
const page = Page({ name: "string" }).assert({ items: [{ name: "a" }], total: 1 })
console.log(page.items.map(u => u.name))
const Box = type("<t>", { value: "t" })
const out = Box("'a' | 'b'")({ value: "c" })
if (out instanceof type.errors) console.log(out.issues.map(e => e.code))
const Pair = scope({ id: "string" }).generic("t")(["t", "id"])
console.log(Pair("number").assert([1, "a"]).map(x => x))
export const Named = type.generic("t")({ name: "t" })("string").or("null")`
			attest(diagnosticsOf(source)).equals([])
			attest(statusesOf(source)).snap([
				"2:14 accepted",
				"3:14 accepted { items: { name: string }[], total: number }",
				"5:13 accepted",
				'6:13 accepted { value: "a" | "b" }',
				"8:14 accepted",
				"9:13 accepted [number, string]",
				"10:22 accepted { name: string } | null"
			])
		})

		it("validations and runtime uses of arktype are not sites", () => {
			attest(
				statusesOf(
					`import { type, scope, fn, regex } from "arktype"
import { createClient } from "./client.ts"
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
const ada = named({ name: "Ada" })
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
			).snap([
				"3:14 accepted { name: string }",
				"4:15 accepted",
				"5:13 accepted",
				"23:29 accepted"
			])
		})

		it("an introspection read off what holds an exported function's parameter", () => {
			attest(
				diagnosticsOf(
					`import type { Resp } from "./a.ts"
import { make } from "./adapt.ts"
const out: Resp = make({}, "u")
console.log(out.resource.description)`,
					{
						"/a.ts": `import { type } from "arktype"
export const Info = type({ url: "string", "description?": "string" })
export type Info = typeof Info.infer
export const Resp = type({ resource: Info, "error?": "string" })
export type Resp = typeof Resp.infer
export const Input = type({ "error?": "string" })
export type Input = typeof Input.infer`,
						"/adapt.ts": `import type { Info, Input, Resp } from "./a.ts"
export function make(input: Input, url: string): Resp {
	const resource: Info = { url }
	const result: Resp = { resource }
	if (input.error) result.error = input.error
	return result
}`
					}
				)
			).equals([])
		})
		it("data a function validates with a Type it's passed", () => {
			attest(
				diagnosticsOf(
					`import { Product } from "./a.ts"
import { request } from "./api.ts"
const product = await request("/p", Product)
console.log(product.description, product.items[0].description)`,
					{
						"/a.ts": `import { type } from "arktype"
export const Product = type({ description: "string", items: [{ description: "string" }] })`,
						"/api.ts": `export async function request(path: string, schema: { assert: (data: unknown) => any }) {
	const res = await fetch(path)
	return schema.assert(await res.json())
}`
					}
				)
			).equals([])
		})

		it("reads off a parameter annotated with an interface it imports", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import type { Options } from "./types.ts"
export const T = type("string")
export function readOptions(opts: Options) {
	return [opts.default, opts.in]
}`,
					{
						"/types.ts": `export interface Options { default: string; in: number }`
					}
				)
			).equals([])
		})

		it("reads off a type re-exported through relative modules", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import type { Schema } from "./index.ts"
import type * as Json from "./json.ts"
export const T = type("string")
export const defaultOf = (schema: Schema) => schema.default
export const outOf = (schema: Json.Piped) => schema.out`,
					{
						"/index.ts": `export type { JsonSchema as Schema } from "./schema.ts"`,
						"/schema.ts": `export * from "./json.ts"`,
						"/json.ts": `import type { JSONSchema7 } from "json-schema"
export type JsonSchema = JSONSchema7
export type Piped = { in: string; out: string }`
					}
				)
			).equals([])
		})

		it("reads off a type-only import's inferred type", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import { sync } from "./sync.ts"
export const T = type("string")
export const run = (raw: string) => (JSON.parse(raw) as any[]).map(sync)`,
					{
						"/types.ts": `import { type } from "arktype"
export const Email = type({ to: "string", subject: "string" })`,
						"/sync.ts": `import type { Email } from "./types.ts"
import type * as Types from "./types.ts"
type Message = typeof Email.infer
export const sync = (email: Message) => email.to
export const subjectOf = (email: typeof Types.Email.inferIn) => email.subject`
					}
				)
			).equals([])
		})

		it("reads off the inferred type of a Type held in a const", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
export const schemas = { status: { mutation: type({ messageId: "string" }) } }
export function update(payload: typeof schemas.status.mutation.infer) {
	const { messageId, ...rest } = payload
	return [\`/messages/\${messageId}/status\`, rest]
}`)
			).equals([])
		})

		it("reads off a destructured parameter's tuple annotation", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
import type { JSONSchema7 } from "json-schema"
export const T = type("string")
export const addOption = ([key, value]: [name: string, JSONSchema7?]) => [
	key,
	value?.default
]`)
			).equals([])
		})

		it("reads off an annotated interface with a function member", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import { parse, type Parsed } from "./parse.ts"
export const T = type("string")
export function requiredOf(derive: () => Parsed) {
	let parsed: Parsed
	parsed = derive()
	return parsed.schema.required
}
export const dataOf = (input: unknown) => parse(input).data?.required`,
					{
						"/parse.ts": `import type { JSONSchema7 } from "json-schema"
import type * as z from "zod"
export interface Parsed {
	schema: JSONSchema7
	read: (path: string[]) => unknown
}
export function parse(
	data: unknown
): { success: true; data: JSONSchema7 } | { success: false; error: z.core.$ZodError } {
	return { success: true, data: data as JSONSchema7 }
}`
					}
				)
			).equals([])
		})

		it("a call to a function-typed member that returns a Type", () => {
			attest(
				unhinted(`import { type, type Type } from "arktype"
export const T = type("string")
export const nullable = (factory: { make: () => Type }) =>
	factory.make().or("null")
export const orNull = (make: () => Type) => make().or("null")`)
			).snap([
				"/main.ts:4:2  factory.make().or reads or, which a standalone validator lacks\n  the build can't tell where `factory.make()` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:5:45  make().or reads or, which a standalone validator lacks\n  the build can't tell where `make()` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a tuple expression with a Type as its first element", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const Exam = type({ name: "string" })
const Exams = type(Exam, "[]")
export function namesOf(data: unknown) {
	const exams = Exams(data)
	if (exams instanceof type.errors) return exams.summary
	return exams.map(exam => exam.name)
}`)
			).equals([])
		})

		it("reads a JS module's parameters as the .d.ts beside it annotates them", () => {
			// under creationChecks "helpers", as Vitest runs, every module is checked
			const helperDiagnosticsOf = (files: Record<string, string>) =>
				new Precompiler(memoryHost(files), { creationChecks: "helpers" })
					.analyzeSites(files["/env/index.js"], "/env/index.js")
					.diagnostics.map(d => renderDiagnostic(d).split("\n")[0])
			const js = {
				"/env/index.js": `import { presetOf } from "./presets.js"
export function createEnv(opts) {
	const extended = opts.extends ? opts.extends.map(presetOf) : []
	return { ...extended, server: opts.server }
}
export const describe = (opts) => opts.extends.length
export default (opts) => opts.extends.length`,
				"/env/presets.js": `export const presetOf = preset => preset.id`
			}
			attest(helperDiagnosticsOf(js)).snap([
				"/env/index.js:3:19  opts.extends reads extends, which a standalone validator lacks",
				"/env/index.js:3:34  opts.extends reads extends, which a standalone validator lacks",
				"/env/index.js:6:35  opts.extends reads extends, which a standalone validator lacks",
				"/env/index.js:7:26  opts.extends reads extends, which a standalone validator lacks"
			])
			attest(
				helperDiagnosticsOf({
					...js,
					"/env/index.d.ts": `import type { Preset } from "./presets.js"
export interface Options { extends?: Preset[]; server: Record<string, unknown> }
export declare function createEnv(opts: Options): object
export declare const describe: (opts: Options) => number
declare const _default: (opts: Options) => number
export default _default`,
					"/env/presets.d.ts": `export interface Preset { id: string }
export declare const presetOf: (preset: Preset) => string`
				})
			).equals([])
		})

		it("reads off a cast declaring the members it reads", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
export const T = type("string")
export function piped(ctx: any) {
	const def = ctx.def
	const pipeDef = def as typeof def & { in: unknown }
	if (pipeDef.in) return pipeDef
}`)
			).equals([])
		})

		it("reads off what a method declares it returns", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import { service } from "./service.ts"
export const T = type("string")
export const created = async () => {
	const result = await service.create()
	return \`/projects/\${result.id}\`
}`,
					{
						"/service.ts": `import { randomUUID } from "node:crypto"
export const service = new (class {
	async create(): Promise<{ id: string }> {
		return { id: randomUUID() }
	}
})()`
					}
				)
			).equals([])
		})

		it("calls a declared method off an instance held beside another", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import { steam } from "./steam.ts"
export const T = type("string")
export const resolve = async (input: string, cached: boolean) => {
	const id = cached ? await steam.cachedId(input) : await steam.resolveId(input)
	return \`/profiles/\${id}\`
}`,
					{
						"/steam.ts": `import { db } from "./db.ts"
class Client {
	private async store(profile: { id: string }) {
		let stored
		if (profile.id) stored = await db.profile.update(profile)
		else stored = await db.profile.create(profile)
		return stored
	}
	async resolveId(input: string): Promise<string | null> {
		return input || null
	}
	cachedId(input: string): string {
		return input
	}
}
const globalForClient = global as unknown as { client: Client }
export const steam = globalForClient.client || new Client()
if (process.env.NODE_ENV !== "production") globalForClient.client = steam`,
						"/db.ts": `export type Db = { profile: unknown }
export const db = {} as Db`
					}
				)
			).equals([])
		})

		it("reads off a member typed as an element of a const array", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
export const T = type("string")
const metrics = ["LCP", "INP"] as const
export type Summary = { metric: (typeof metrics)[number]; detail: unknown }
export const describe = (summary: Summary) => \`\${summary.metric}\``)
			).equals([])
		})

		it("reads off a type literal with an unknown member", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
export const T = type("string")
export type Schema = { default?: unknown; required?: string[] }
export function defaultOf(schema: Schema): unknown {
	return schema.default
}`)
			).equals([])
		})
	})

	describe("helpers", () => {
		it("calls with arguments the build reads", () => {
			const source = `import { type, type Type } from "arktype"
const text = (max: number) => type(\`0 < string <= \${max}\`)
function range(min: number, max: number) {
	return type({ value: \`\${min} <= number <= \${max}\` })
}
const short = (max: number) => text(max / 10)
const nullable = <t>(T: Type<t>) => T.or("null")
const LIMIT = 50
export const Name = text(LIMIT)
export const Bio = nullable(text(LIMIT * 10))
export const Signup = type({ name: Name, age: range(0, 150), code: short(60) })`
			attest(statusesOf(source)).snap([
				"9:21 accepted 1 <= string <= 50",
				"10:20 accepted 1 <= string <= 500 | null",
				"11:23 accepted { age: { value: 0 <= number <= 150 }, code: 1 <= string <= 6, name: 1 <= string <= 50 }"
			])
			attest(diagnosticsOf(source)).equals([])
		})

		it("imported by name, through a barrel or off a namespace", () => {
			const files = {
				"/fields.ts": `import { type, type Type } from "arktype"
export const text = (max: number) => type(\`0 < string <= \${max}\`)
export const word = (max: number) => text(max).and("string.alpha")
export const nullable = <t>(T: Type<t>) => T.or("null")`,
				"/index.ts": `export * from "./fields.ts"`
			}
			const source = `import { type } from "arktype"
import { text } from "./fields.ts"
import { word } from "./index.ts"
import * as fields from "./fields.ts"
export const Name = text(50)
export const Word = word(80)
export const Bio = fields.text(500)
export const Form = type({ name: text(20), word: fields.word(40) })
export const Nickname = fields.nullable(text(10)).array()`
			attest(statusesOf(source, files)).snap([
				"5:21 accepted 1 <= string <= 50",
				"6:21 accepted 1 <= /^[A-Za-z]*$/ <= 80",
				"7:20 accepted 1 <= string <= 500",
				"8:21 accepted { name: 1 <= string <= 20, word: 1 <= /^[A-Za-z]*$/ <= 40 }",
				"9:25 accepted (1 <= string <= 10 | null)[]"
			])
			attest(diagnosticsOf(source, files)).equals([])
			// each importer checks its own calls
			const exporter = new Precompiler(memoryHost(files)).analyzeSites(
				files["/fields.ts"],
				"/fields.ts"
			)
			attest([exporter.sites, exporter.diagnostics]).equals([[], []])
		})

		it("a call with arguments the build can't read", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const text = (max: number) => type(\`0 < string <= \${max}\`)
const twice = (max: number) => text(max * 2)
export function field(input: { max: number }) {
	let Field = twice(input.max)
	return Field
}
export const Short = twice(5)`)
			).snap([
				"/main.ts:5:14  twice(input.max) cannot be precompiled\n  `input` is a parameter of field (/main.ts:4:23); its value is known only at runtime\n  Write the definition where field is called, with the value it passes for `input`, so the build precompiles each call."
			])
		})

		it("reads outside a call the build precompiles", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import * as fields from "./fields.ts"
const text = (max: number) => type(\`0 < string <= \${max}\`)
export const limits = [10, 20].map(text)
export const byName = { text }
export default text
export const all = Object.values(fields)
export const loaded = import("./fields.ts")
// @ark-runtime
export const Island = text(5)`,
					{
						"/fields.ts": `import { type } from "arktype"
export const email = (max: number) => type(\`string.email <= \${max}\`)`
					}
				)
			).snap([
				"/main.ts:4:36  `text` is read outside a call the build precompiles\n  type(`0 < string <= ${max}`) (/main.ts:3:31) reads `max`, a parameter of text, so the build precompiles it at each call to text\n  Call text directly, with arguments the build can read, like literals and consts, so it precompiles each call.",
				"/main.ts:5:25  `text` is read outside a call the build precompiles\n  type(`0 < string <= ${max}`) (/main.ts:3:31) reads `max`, a parameter of text, so the build precompiles it at each call to text\n  Call text directly, with arguments the build can read, like literals and consts, so it precompiles each call.",
				"/main.ts:6:16  `text` is read outside a call the build precompiles\n  type(`0 < string <= ${max}`) (/main.ts:3:31) reads `max`, a parameter of text, so the build precompiles it at each call to text\n  Call text directly, with arguments the build can read, like literals and consts, so it precompiles each call.",
				"/main.ts:7:34  `fields` is read outside a call the build precompiles\n  type(`string.email <= ${max}`) (/fields.ts:2:39) reads `max`, a parameter of email, so the build precompiles it at each call to email\n  Call email directly, with arguments the build can read, like literals and consts, so it precompiles each call.",
				'/main.ts:8:23  `import("./fields.ts")` is read outside a call the build precompiles\n  type(`string.email <= ${max}`) (/fields.ts:2:39) reads `max`, a parameter of email, so the build precompiles it at each call to email\n  Call email directly, with arguments the build can read, like literals and consts, so it precompiles each call.',
				"/main.ts:10:23  `text` is read outside a call the build precompiles\n  type(`0 < string <= ${max}`) (/main.ts:3:31) reads `max`, a parameter of text, so the build precompiles it at each call to text\n  Call text directly, with arguments the build can read, like literals and consts, so it precompiles each call."
			])
		})

		it("functions no code reaches", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
function unused(n: number) {
	let T = type(\`string <= \${n}\`)
	return T
}
function used(n: number) {
	let T = type(\`string <= \${n}\`)
	return T
}
export const read = (n: number) => used(n)`)
			).snap([
				"/main.ts:7:10  type(`string <= ${n}`) cannot be precompiled\n  `n` is a parameter of used (/main.ts:6:15); its value is known only at runtime\n  Write the definition where used is called, with the value it passes for `n`, so the build precompiles each call."
			])
		})

		it("consts before one return", () => {
			const files = {
				"/fields.ts": `export const nullable = T => {
	const N = T.or("null")
	return N
}`
			}
			const source = `import { type } from "arktype"
import { nullable } from "./fields.ts"
const text = (max: number) => {
	const T = type(\`0 < string <= \${max}\`)
	return T.describe(\`at most \${max} characters\`)
}
function range(bounds: { min: number; max?: number }) {
	type Bounds = typeof bounds
	const { min, max = 100 } = bounds
	return type(\`\${min} <= number <= \${max}\`)
}
export const Name = text(20)
export const User = type({ name: text(50), age: range({ min: 0 }), bio: nullable(text(280)) })`
			attest(statusesOf(source, files)).snap([
				"12:21 accepted 1 <= string <= 20",
				"13:21 accepted { age: 0 <= number <= 100, bio: 1 <= string <= 280 | null, name: 1 <= string <= 50 }"
			])
			attest(diagnosticsOf(source, files)).equals([])
		})

		it("a const read before its declaration", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const text = (max: number) => {
	const limit = () => doubled
	const T = type(\`string <= \${limit()}\`)
	const doubled = max * 2
	return T
}
export const Name = text(5)`)
			).snap([
				"/main.ts:8:21  text(5) cannot be precompiled\n  `doubled` is read before its declaration (/main.ts:5:8)\n  Declare `doubled` before the const that reads it."
			])
		})

		it("a const nothing reads", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
const text = (max: number) => {
	const startedAt = Date.now()
	return type(\`string <= \${max}\`)
}
export const Name = text(5)`)
			).snap([
				"/main.ts:6:21  text(5) cannot be precompiled\n  `Date.now` is not one of the build's pure built-ins\n  Replace `Date.now()` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime."
			])
		})

		it("a value a call computes that nothing reads", () => {
			attest(
				unhinted(`import { type } from "arktype"
const text = (max: number, startedAt = Date.now()) => type(\`string <= \${max}\`)
const label = (max: number) => {
	const { at = Date.now() } = {} as { at?: number }
	return type(\`string <= \${max}\`)
}
export const Defaulted = text(5)
export const Passed = text(5, Date.now())
export const Destructured = label(5)`)
			).snap([
				"/main.ts:7:26  text(5) cannot be precompiled\n  `Date.now` is not one of the build's pure built-ins",
				"/main.ts:8:23  text(5, Date.now()) cannot be precompiled\n  `Date.now` is not one of the build's pure built-ins",
				"/main.ts:9:29  label(5) cannot be precompiled\n  `Date.now` is not one of the build's pure built-ins"
			])
		})

		it("configure() in a helper", () => {
			attest(
				diagnosticsOf(`import { configure, type } from "arktype"
const text = (max: number) => {
	const config = configure({ exactOptionalPropertyTypes: false })
	return type(\`string <= \${max}\`)
}
export const Name = text(5)`)
			).snap([
				"/main.ts:6:21  text(5) cannot be precompiled\n  `configure({ exactOptionalPropertyTypes: false })` configures arktype as the function runs, which a call the build precompiles doesn't\n  Call configure() in the build's config module instead, so every Type is precompiled with what it sets."
			])
		})

		it("a body with other statements", () => {
			attest(
				precompile(`import { type } from "arktype"
const text = (max: number) => {
	if (max > 1000) throw new Error("too long")
	return type(\`string <= \${max}\`)
}
export const User = type({ name: text(50) })`).diagnostics.map(renderDiagnostic)
			).snap([
				"/main.ts:6:21  type({ name: text(50) }) cannot be precompiled\n  `text(50)` (/main.ts:6:34) is not static, so the site holds it as a Standard Schema, which a standalone validator can't receive yet\n  `text(50)` calls a function the build does not interpret\n  `text` (/main.ts:2:14) is not a static helper: it runs `if (max > 1000) throw new Error(\"too long\")` (/main.ts:3:2), where a static helper declares only consts before one `return`\n  Write text as one expression, or as consts and one `return`, so the build precompiles each call with the values it's passed."
			])
		})
	})

	describe("rejected", () => {
		it("a read off a value whose annotation the build can't read", () => {
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
import { navigate } from "./router.ts"
export const T = type("string")
type Navigation = Parameters<Parameters<typeof navigate>[0]>[0]
export function visit(nav: Navigation) {
	if (nav.to) return nav.to
}`,
					{
						"/router.ts": `export const navigate = (callback: (nav: { to: string }) => void) => callback({ to: "/" })`
					}
				)
			).snap([
				'/main.ts:6:6  nav.to reads to, which a standalone validator lacks\n  `nav` is a parameter of visit, so it may be a Type, which the standalone runtime replaces with a validator\n  Make visit a Generic, which the build precompiles where it\'s called: `const visit = type("<t>", def)`, with "t" in def where it reads `nav`. If `nav` isn\'t a Type, annotate it with an interface or type literal declaring what it reads, since the build can\'t read `Navigation`.',
				'/main.ts:6:21  nav.to reads to, which a standalone validator lacks\n  `nav` is a parameter of visit, so it may be a Type, which the standalone runtime replaces with a validator\n  Make visit a Generic, which the build precompiles where it\'s called: `const visit = type("<t>", def)`, with "t" in def where it reads `nav`. If `nav` isn\'t a Type, annotate it with an interface or type literal declaring what it reads, since the build can\'t read `Navigation`.'
			])
		})

		it("a read off an annotated type's unknown member or a Type it imports", () => {
			attest(
				unhinted(
					`import { type, type Type } from "arktype"
import type { Forms } from "./types.ts"
type Schema = { default?: unknown }
export const T = type("string")
export const nullable = (schema: Schema) => (schema.default as any).or("null")
export const user = (forms: Forms) => forms.user.or("null")
export function inOf(t: Type & { note: string }) {
	if (t.in) return t.note
}`,
					{
						"/types.ts": `import type { Type } from "arktype"
export type Forms = { user: Type }`
					}
				)
			).snap([
				"/main.ts:5:45  (schema.default as any).or reads or, which a standalone validator lacks\n  the build can't tell where `schema.default as any` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:6:39  forms.user.or reads or, which a standalone validator lacks\n  the build can't tell where `forms.user` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:8:6  t.in reads in, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a read off a parameter annotated with a global container type", () => {
			attest(
				unhinted(
					`import { type, type Type } from "arktype"
export const T = type("string")
const cost = (raw: unknown) => raw
export function stage(record: Record<string, unknown> | null | undefined) {
	return cost(record?.merge)
}
export function awaited(t: Awaited<unknown> | null) {
	return cost(t?.merge)
}
export function held(record: Record<string, unknown>) {
	return cost(record.merge.or)
}
export function typed(forms: Record<string, Type>) {
	return cost(forms.user.or)
}
export function first(ts: Array<unknown>) {
	return cost(ts[0].or)
}
export function usage(record: unknown) {
	const rec = record as Record<string, unknown>
	return [stage(rec), awaited(rec), held(rec), typed(rec as never), first(rec as never)]
}`
				)
			).snap([
				"/main.ts:11:14  record.merge.or reads or, which a standalone validator lacks\n  the build can't tell where `record.merge` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:14:14  forms.user.or reads or, which a standalone validator lacks\n  the build can't tell where `forms.user` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:17:14  ts[0].or reads or, which a standalone validator lacks\n  the build can't tell where `ts[0]` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:21:22  `awaited` is read outside a call the build precompiles\n  t?.merge (/main.ts:8:14) reads `t`, a parameter of awaited, so the build precompiles it at each call to awaited"
			])
		})

		it("a handler of an intrinsic JSX element, but not of a component", () => {
			const source = `import { type } from "arktype"
export const Name = type("string")
export const Field = (props: { Picker: any; onPick: (t: unknown) => void }) => (
	<label>
		<input onFocus={e => e.target.select()} ref={el => el?.focus()} />
		<my-element onchange={e => e.target.or} />
		<Picker onPick={t => t.or("null")} />
		<props.Picker onPick={t => props.onPick(t.or("null"))} />
	</label>
)
declare const Picker: any`
			attest(
				new Precompiler(memoryHost({ "/main.tsx": source }))
					.analyzeSites(source, "/main.tsx")
					.diagnostics.map(renderDiagnostic)
					.map(d => d.slice(0, d.lastIndexOf("\n")))
			).snap([
				"/main.tsx:7:24  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.tsx:8:43  t.or reads or, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("parameter", () => {
			attest(
				diagnosticsOf(`import { scope, type } from "arktype"
const makeField = (limit: number) => type(\`string <= \${limit}\`)
export const fields = [1, 2].map(makeField)
export function make(jitless: boolean) {
	const $ = scope({}, { jitless })
	const T = $.type("string")
	return T
}`)
			).snap([
				"/main.ts:3:34  `makeField` is read outside a call the build precompiles\n  type(`string <= ${limit}`) (/main.ts:2:38) reads `limit`, a parameter of makeField, so the build precompiles it at each call to makeField\n  Call makeField directly, with arguments the build can read, like literals and consts, so it precompiles each call.",
				"/main.ts:5:12  scope({}, { jitless }) cannot be precompiled\n  `jitless` is passed as a value rather than a definition, so it must be static\n  `jitless` is a parameter of make (/main.ts:4:22); its value is known only at runtime\n  Write the definition where make is called, with the value it passes for `jitless`, so the build precompiles each call.",
				'/main.ts:6:12  $.type("string") cannot be precompiled\n  `$` is the Scope at /main.ts:5:12, which the build refuses\n  Standalone builds construct every Type at build time. Make it static, or put // @ark-runtime on the line before it, so arktype defines it at runtime.'
			])
		})

		it("calls the build can't follow", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { max } from "lodash"
import { most } from "./limits.ts"
const load = () => {
	let def = 5
	return def
}
const limits = { max: () => 5 }
const A = type(\`number < \${load()}\`)
const B = type(\`number < \${max([1, 2])}\`)
const C = type(\`number < \${limits.max()}\`)
const D = type(\`number < \${most()}\`)
const T = type("string").pipe(s => s.length)
const E = T.json`,
					{
						"/limits.ts": `const limits = { max: 5 }\nexport const most = () => limits.max`
					}
				)
			).snap([
				"9:11 rejected\n  `load()` calls a function the build does not interpret\n  `load` (/main.ts:4:14) is not a static helper: it runs `let def = 5` (/main.ts:5:2), where a static helper declares only consts before one `return`",
				"10:11 rejected\n  `lodash` is a package the build does not read",
				"11:11 rejected\n  `limits.max` is a function reached through a property rather than a binding",
				"12:11 rejected\n  the site reads `limits` (/limits.ts:1:7), which its module cannot import, so the site cannot compare it at creation",
				"13:11 accepted (In: string) => Out<unknown>",
				"14:11 rejected\n  `T.json` (/main.ts:14:11) prints the name of a function (/main.ts:13:31), which the build knows only by a placeholder"
			])
		})

		it("opaque definitions are Standard Schemas", () => {
			const source = `import { type } from "arktype"
import { z } from "zod"
export const wrap = (schema: unknown) => {
	const Wrapped = type({ value: schema })
	return Wrapped
}
const A = type({ name: z.string() })`
			// as writing them refuses them, which only analyze() reports
			attest(
				new Precompiler(memoryHost({ "/main.ts": source }))
					.analyze(source, "/main.ts")
					.diagnostics.map(d => renderDiagnostic(d).split("\n")[0])
			).snap([
				"/main.ts:4:18  type({ value: schema }) can't be precompiled yet",
				"/main.ts:7:11  type({ name: z.string() }) can't be precompiled yet"
			])
			attest(diagnosticsOf(source)).snap([
				'/main.ts:4:32  `schema` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `schema` is a parameter of wrap (/main.ts:3:22); its value is known only at runtime\n  A Standard Schema other than a Type, like a Zod schema, needs no change. If it\'s a Type, make wrap a Generic, which the build precompiles where it\'s called: `const wrap = type("<t>", { value: "t" })`.',
				"/main.ts:7:24  `z.string()` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `zod` is a package the build does not read\n  A Standard Schema other than a Type, like a Zod schema, needs no change. If it's a Type, make it static so the build precompiles it with the site."
			])
		})

		it("static Standard Schemas", () => {
			attest(
				precompile(`import { type } from "arktype"
const schema = { "~standard": { version: 1, vendor: "x", validate: (value: unknown) => ({ value }) } }
export const A = type({ a: schema })
export const B = type({ b: { "~standard": { version: 1, vendor: "x", validate: (value: unknown) => ({ value }) } } })`).diagnostics.map(
					renderDiagnostic
				)
			).snap([
				"/main.ts:3:18  type({ a: schema }) can't be precompiled yet\n  the Standard Schema `schema` can't be precompiled to a standalone validator\n  Define the schema with ArkType, which the build precompiles, or put // @ark-runtime on the line before this definition, so arktype defines it at runtime.",
				'/main.ts:4:18  type({ b: { "~standard": { version: 1, vendor: "x", validat… can\'t be precompiled yet\n  the Standard Schema holding `(value: unknown) => ({ value })` (/main.ts:4:80) can\'t be precompiled to a standalone validator\n  Define the schema with ArkType, which the build precompiles, or put // @ark-runtime on the line before this definition, so arktype defines it at runtime.'
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

		it("opaque values arktype reads", () => {
			attest(
				statusesOf(`import { type } from "arktype"
export function make(v: unknown, n: number, p: (s: string) => boolean) {
	let A = type("string").and(type.unit(v))
	let B = type.string.atMostLength(n)
	let C = type("string").narrow(p)
	let D = type({ a: "string" }).configure({ examples: [v] })
	let E = type({ a: v })
	return [A, B, C, D, E]
}`)
			).snap([
				"3:10 rejected\n  arktype reads `v` while defining the type, so it must be static\n  `v` is a parameter of make (/main.ts:2:22); its value is known only at runtime",
				"4:10 rejected\n  `type.string.atMostLength(n)` reads the structure of `n`, which is not static\n  `n` is a parameter of make (/main.ts:2:34); its value is known only at runtime",
				"5:10 rejected\n  arktype reads `p` while defining the type, so it must be static\n  `p` is a parameter of make (/main.ts:2:45); its value is known only at runtime",
				"6:10 rejected\n  arktype reads `v` while defining the type, so it must be static\n  `v` is a parameter of make (/main.ts:2:22); its value is known only at runtime",
				"7:10 accepted { a: (In: unknown) => Out<unknown> }"
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

		it("values written before the site", () => {
			attest(
				statusesOf(
					`import { type } from "arktype"
import { shared } from "./shared.ts"
let max = 5
max++
const shape: Record<string, string> = {}
for (const f of ["a", "b"]) shape[f] = "string"
const later = { x: "string" }
export const A = type(\`number < \${max}\`)
export const B = type(shape)
export const C = type(shared)
export const D = type(later)
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
				"8:18 rejected\n  `max` is assigned at /main.ts:4:1, so its value at the site is not known",
				"9:18 rejected\n  `shape` is written at /main.ts:6:29, so its value at the site is not known",
				"10:18 rejected\n  `shared` is imported from /shared.ts\n  `shared` is written at /shared.ts:3:2, so its value at the site is not known",
				"11:18 accepted { x: string }",
				"14:20 rejected\n  `called` is written at /main.ts:15:1, so its value at the site is not known"
			])
		})

		it("holes read through an object written before the site", () => {
			const diagnostics = precompile(
				`import { type } from "arktype"
const isX = (v: string) => v !== "x"
const Password = type("string > 0").narrow(isX)
const message = (ctx: { expected: string }) => \`must \${ctx.expected}\`
const written = { current: Password }
written.current = type("string")
let assigned = { message }
const byKey: Record<string, unknown> = {}
for (const k of ["current", "confirm"]) byKey[k] = Password
class Entity {}
const classes = { entity: ["instanceof", Entity] }
export const A = type(written)
export const B = type("string").configure(assigned)
export const C = type(byKey)
export const D = type(classes)
assigned = { message: () => "no" }`
			).diagnostics.map(renderDiagnostic)
			attest(diagnostics).snap([
				"/main.ts:12:18  type(written) cannot be precompiled\n  `written` is written at /main.ts:6:1, so its value at the site is not known\n  Write the value whole in its literal. Where it differs by case, define a Type for each case and choose one at runtime.",
				'/main.ts:13:18  type("string").configure(assigned) cannot be precompiled\n  `assigned` is assigned at /main.ts:16:1, so its value at the site is not known\n  Replace `assigned` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.',
				"/main.ts:14:18  type(byKey) cannot be precompiled\n  `byKey` is written at /main.ts:9:41, so its value at the site is not known\n  Write the value whole in its literal. Where it differs by case, define a Type for each case and choose one at runtime.",
				"/main.ts:15:18  type(classes) can't be precompiled yet\n  the site's value holds `class Entity {}` (/main.ts:10:1), which it reads outside its own source\n  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime."
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

		it("reads a validator lacks", () => {
			attest(
				unhinted(`import { type } from "arktype"
const T = type({ a: "string.trim" })
function g() {
	const t = T
	return t
}
const k = "in" as const
const { [k]: I } = T
class C {
	static User = T
}
class D extends C {}
const registry = new Map()
registry.set("admin", T)
export const A = g().or("null")
export const B = D.User.or("null")
export const E = registry.get("admin").or("null")
export const schemas = [T].map(t => t.toJsonSchema())
console.log(Object.keys(T), String(T), JSON.stringify(T))`)
			).snap([
				"/main.ts:8:9  [k]: I reflects on a Type, whose properties a standalone validator doesn't share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:15:18  g().or reads or, which a standalone validator lacks\n  `g()` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:16:18  D.User.or reads or, which a standalone validator lacks\n  `D.User` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				'/main.ts:17:18  registry.get("admin").or reads or, which a standalone validator lacks\n  the build can\'t tell where `registry.get("admin")` comes from, so it may be a Type, which the standalone runtime replaces with a validator',
				"/main.ts:18:37  t.toJsonSchema reads toJsonSchema, which a standalone validator lacks\n  the build can't tell where `t` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:19:13  Object.keys(T) reflects on a Type, whose properties a standalone validator doesn't share\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:19:29  String(T) reads expression, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:19:40  JSON.stringify(T) reads toJSON, which a standalone validator lacks\n  `T` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
		})

		it("a Type a getter returns or this reads in a static member", () => {
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
export const A = schemas.User.or("null")
export const B = Forms.Admin.or("null")
export const anded = Sub.and({ b: "string" })`)
			).snap([
				"/main.ts:14:13  this.t.or reads or, which a standalone validator lacks\n  `this.t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:16:10  this.t.and reads and, which a standalone validator lacks\n  `this.t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:19:3  this.t.array reads array, which a standalone validator lacks\n  `this.t` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:23:18  schemas.User.or reads or, which a standalone validator lacks\n  `schemas.User` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:24:18  Forms.Admin.or reads or, which a standalone validator lacks\n  `Forms.Admin` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
		})

		it("a parameter the build can't see called", () => {
			attest(
				diagnosticsOf(`import { type, type Type } from "arktype"
export function nullable(t: Type) {
	let n = t.or("null")
	return n
}
export const forms = {
	optional(t: typeof User) {
		return t.or("undefined")
	}
}
const User = type({ name: "string" })`)
			).snap([
				'/main.ts:3:10  t.or reads or, which a standalone validator lacks\n  `t` is a parameter of nullable, so it may be a Type, which the standalone runtime replaces with a validator\n  Make nullable a Generic, which the build precompiles where it\'s called: `const nullable = type("<t>", "t | null")`.',
				'/main.ts:8:10  t.or reads or, which a standalone validator lacks\n  `t` is a parameter of optional, so it may be a Type, which the standalone runtime replaces with a validator\n  Make optional a Generic, which the build precompiles where it\'s called: `const optional = type("<t>", "t | undefined")`.'
			])
		})

		it("a Generic for a helper composing its parameter", () => {
			attest(
				diagnosticsOf(`import { type, type Type } from "arktype"
const Id = type({ id: "string" })
export function withId<t>(T: Type<t>) { let R = T.and(Id); return R }
export function listOf(T) { let R = T.array(); return R }
export function piped<t>(T: Type<t>) { let R = T.pipe(v => v); return R }
export const boxed = <t>(T: Type<t>) => type({ value: T, all: [T, "[]"] })
export const unwrapped = (all: Type[]) => all.map(T => T.or("null"))`)
			).snap([
				'/main.ts:3:49  T.and reads and, which a standalone validator lacks\n  `T` is a parameter of withId, so it may be a Type, which the standalone runtime replaces with a validator\n  Make withId a Generic, which the build precompiles where it\'s called: `const withId = type("<t>", ["t", "&", Id])`.',
				'/main.ts:4:37  T.array reads array, which a standalone validator lacks\n  `T` is a parameter of listOf, so it may be a Type, which the standalone runtime replaces with a validator\n  Make listOf a Generic, which the build precompiles where it\'s called: `const listOf = type("<t>", "t[]")`. If `T` isn\'t a Type, annotate it with its type.',
				'/main.ts:5:48  T.pipe reads pipe, which a standalone validator lacks\n  `T` is a parameter of piped, so it may be a Type, which the standalone runtime replaces with a validator\n  Make piped a Generic, which the build precompiles where it\'s called: `const piped = type("<t>", def)`, with "t" in def where it reads `T`.',
				'/main.ts:6:55  `T` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `T` is a parameter of boxed (/main.ts:6:26); its value is known only at runtime\n  A Standard Schema other than a Type, like a Zod schema, needs no change. If it\'s a Type, make boxed a Generic, which the build precompiles where it\'s called: `const boxed = type("<t>", { value: "t", all: ["t", "[]"] })`.',
				'/main.ts:6:64  `T` is not static, so the site accepts it only as a Standard Schema that is not a Type\n  `T` is a parameter of boxed (/main.ts:6:26); its value is known only at runtime\n  A Standard Schema other than a Type, like a Zod schema, needs no change. If it\'s a Type, make boxed a Generic, which the build precompiles where it\'s called: `const boxed = type("<t>", { value: "t", all: ["t", "[]"] })`.',
				"/main.ts:7:56  T.or reads or, which a standalone validator lacks\n  the build can't tell where `T` comes from, so it may be a Type, which the standalone runtime replaces with a validator\n  If it isn't a Type, annotate it with its type. If it is, build with runtime: \"arktype\"."
			])
		})

		it("a fix for each value a definition can't know", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
export function bounded(max: number) {
	let Bounded = type(\`string <= \${max}\`)
	return Bounded
}
const shape: Record<string, string> = { title: "string" }
if (import.meta.env.DEV) shape["debugNote?"] = "string"
export const Post = type(shape)
const Bad = type("string & number")
export const Holder = type({ bad: Bad })`).map(d =>
					d.slice(d.lastIndexOf("\n") + 3)
				)
			).snap([
				"Write the definition where bounded is called, with the value it passes for `max`, so the build precompiles each call.",
				"Write the value whole in its literal. Where it differs by case, define a Type for each case and choose one at runtime.",
				"Fix the definition, which throws the same ParseError at runtime, or set allowUnsafe: true to build anyway, with a warning.",
				"Fix the definition it reads, which throws the same ParseError at runtime."
			])
		})

		it("a key's definition in a const", () => {
			attest(
				precompile(`import { type } from "arktype"
const Tier = type("'free' | 'pro'")
const Plan = Tier.default("free")
const Nickname = type("string").optional()
export const Note = type("string").default("")
export const User = type({ plan: Plan, "nickname": Nickname })`).diagnostics.map(
					renderDiagnostic
				)
			).snap([
				"/main.ts:3:14  Tier.default(\"free\") can't be precompiled yet\n  .default() gives the definition of an object's key, not a Type, so it's precompiled where an object holds it\n  Write it at the key it's for, in place of the const: `{ plan: Tier.default(\"free\") }`.",
				'/main.ts:4:18  type("string").optional() can\'t be precompiled yet\n  .optional() gives the definition of an object\'s key, not a Type, so it\'s precompiled where an object holds it\n  Write it at the key it\'s for, in place of the const: `{ "nickname": type("string").optional() }`.',
				'/main.ts:5:21  type("string").default("") can\'t be precompiled yet\n  .default() gives the definition of an object\'s key, not a Type, so it\'s precompiled where an object holds it\n  Write it at the key it\'s for, in place of the const: `{ key: type("string").default("") }`.'
			])
		})

		it("functions of errors arktype/runtime doesn't export", () => {
			attest(
				diagnosticsOf(`import { type, flatProblemsByPath, type ArkErrors } from "arktype"
import * as ark from "arktype"
const User = type({ name: "string" })
export const report = (errors: ArkErrors) => flatProblemsByPath(errors)
export const check = (data: unknown) => {
	const out = User(data)
	return out instanceof type.errors ? ark.byPath(out) : out
}
export const readers = [ark.flatByPath]
export const translated = (out: ArkErrors) => out.issues.map(issue => ark.messageIn(issue, {} as never))`)
			).snap([
				'/main.ts:4:46  flatProblemsByPath(errors) calls flatProblemsByPath, which arktype/runtime doesn\'t export\n  Read `errors.issues`, each with its path and message, as in `for (const { path, message } of errors.issues)`, or build with runtime: "arktype".',
				'/main.ts:7:38  ark.byPath(out) calls byPath, which arktype/runtime doesn\'t export\n  Write it as `Object.fromEntries(out.issues.map(issue => [issue.path.join("."), issue]))`, whose keys join each path with ".", where arktype writes an index as [0], or build with runtime: "arktype".',
				'/main.ts:9:25  `ark.flatByPath` is arktype\'s, which arktype/runtime doesn\'t export\n  Write it as `Object.groupBy(errors.issues, issue => issue.path.join("."))`, whose keys join each path with ".", where arktype writes an index as [0], or build with runtime: "arktype".',
				'/main.ts:10:71  ark.messageIn(issue, {} as never) calls messageIn, which arktype/runtime doesn\'t export\n  Read `issue.message`, which a standalone validator writes in English, or build with runtime: "arktype" to write it in a locale.'
			])
		})

		it("a value only known at runtime, named in the fix", () => {
			attest(
				diagnosticsOf(`import { type } from "arktype"
export const Flipped = type({ a: Math.random() > 0.5 ? "string" : "number" })
const def = await fetch("https://example.com/schema.json").then(r => r.json())
export const Fetched = type(def)`).map(d => d.slice(d.lastIndexOf("\n") + 3))
			).snap([
				"Replace `Math.random()` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.",
				"Replace `def` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime."
			])
		})

		it("an export arktype/runtime lacks, reported once", () => {
			attest(
				precompile(`import { Type } from "arktype"
export const isType = (x: unknown) => x instanceof Type
export const isAlsoType = (x: unknown) => x instanceof Type`).diagnostics.map(
					renderDiagnostic
				)
			).snap([
				"/main.ts:2:52  `Type` is arktype's, which arktype/runtime doesn't export, so a standalone build can't load this module\n  Read it only in a definition the build precompiles or one marked // @ark-runtime, or build with runtime: \"arktype\"."
			])
		})

		it("a read off an import the build can't resolve", () => {
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
			attest(
				new Precompiler({ ...host, resolve })
					.analyzeSites(source, "/main.ts")
					.diagnostics.map(d => `${d.severity} ${renderDiagnostic(d)}`)
			).snap([
				"error /main.ts:4:22  User.and reads and, which a standalone validator lacks\n  `User` comes from `~/schemas`, which the build can't resolve, so it may be a Type, which the standalone runtime replaces with a validator\n  If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it, or set allowUnsafe: true to build anyway, with a warning.",
				"error /main.ts:7:20  z.string().optional reads optional, which a standalone validator lacks\n  `z.string()` comes from `astro:content`, which the build can't resolve, so it may be a Type, which the standalone runtime replaces with a validator\n  If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it, or set allowUnsafe: true to build anyway, with a warning."
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

		it("arktype loaded other than by an import declaration", () => {
			attest(
				unhinted(`import { type } from "arktype"
import { createRequire } from "node:module"
import ark = require("arktype")
export const User = type({ name: "string" })
export const load = async () => (await import("arktype")).type
const require = createRequire(import.meta.url)
const { scope } = require("arktype")
export const configure = async () => (await import("arktype/config")).configure
await import("arktype")`)
			).snap([
				'/main.ts:3:1  import ark = require("arktype") loads arktype, which a standalone build replaces with arktype/runtime',
				'/main.ts:5:40  import("arktype") loads arktype, which a standalone build replaces with arktype/runtime',
				'/main.ts:7:19  require("arktype") loads arktype, which a standalone build replaces with arktype/runtime'
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

		it("a Type one alternative holds or a cast's unknown member stores", () => {
			attest(
				unhinted(`import { type } from "arktype"
const User = type({ name: "string" })
class Repo {
	schema(): string {
		return "string"
	}
}
const cached = { schema: () => User }
const repo = Math.random() > 0.5 ? cached : new Repo()
const globalForSchema = global as unknown as { schema: unknown }
globalForSchema.schema = User
export const a = repo.schema().or("null")
export const b = (globalForSchema.schema as any).or("null")`)
			).snap([
				"/main.ts:12:18  repo.schema().or reads or, which a standalone validator lacks\n  the build can't tell where `repo.schema()` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:13:18  (globalForSchema.schema as any).or reads or, which a standalone validator lacks\n  the build can't tell where `globalForSchema.schema as any` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type written beside an exported function's parameter", () => {
			attest(
				unhinted(
					`import { make } from "./adapt.ts"
console.log(make({}).resource.description)`,
					{
						"/a.ts": `import { type } from "arktype"
export const Info = type({ url: "string", "description?": "string" })`,
						"/adapt.ts": `import { Info } from "./a.ts"
export function make(input: { error?: string }) {
	const result: any = {}
	if (input.error) result.error = input.error
	result.resource = Info
	return result
}`
					}
				)
			).snap([
				"/main.ts:2:13  make({}).resource.description reads description, which a standalone validator lacks\n  the build can't tell where `make({}).resource` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type passed to an exported function holding its parameter", () => {
			attest(
				unhinted(
					`import { User } from "./a.ts"
import { id, wrap } from "./adapt.ts"
console.log(wrap(User).schema.description, id(User).description)
console.log(later(User).description)`,
					{
						"/a.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`,
						"/adapt.ts": `export function wrap(input: unknown) {
	const result: any = {}
	result.schema = input
	return result
}
export function id(input: unknown) {
	if (!input) throw new Error("no input")
	return input
}
export const later = (input: unknown) => {
	const read = () => input
	return read()
}`
					}
				)
			).snap([
				"/main.ts:3:13  wrap(User).schema.description reads description, which a standalone validator lacks\n  the build can't tell where `wrap(User).schema` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:3:44  id(User).description reads description, which a standalone validator lacks\n  `id(User)` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read",
				"/main.ts:4:13  later(User).description reads description, which a standalone validator lacks\n  the build can't tell where `later(User)` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type assigned to a parameter", () => {
			attest(
				unhinted(
					`import { User } from "./a.ts"
import { orUser } from "./adapt.ts"
function local(x?: unknown) {
	if (!x) x = User
	return x
}
console.log(local().description, orUser().description)`,
					{
						"/a.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`,
						"/adapt.ts": `import { User } from "./a.ts"
export function orUser(x?: unknown) {
	if (!x) x = User
	return x
}`
					}
				)
			).snap([
				"/main.ts:7:13  local().description reads description, which a standalone validator lacks\n  the build can't tell where `local()` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:7:34  orUser().description reads description, which a standalone validator lacks\n  the build can't tell where `orUser()` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type passed by a spread or to a rest parameter", () => {
			attest(
				unhinted(
					`import { User } from "./a.ts"
function field(schema: unknown, label: string) {
	if (!label) throw new Error("no label")
	return { schema, label }
}
const logged = (...args: [unknown, string]) => field(...args)
const first = (...ts: unknown[]) => ts[0]
console.log(logged(User, "user").schema.description, first(User).description)`,
					{
						"/a.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
					}
				)
			).snap([
				'/main.ts:8:13  logged(User, "user").schema.description reads description, which a standalone validator lacks\n  the build can\'t tell where `logged(User, "user").schema` comes from, so it may be a Type, which the standalone runtime replaces with a validator',
				"/main.ts:8:54  first(User).description reads description, which a standalone validator lacks\n  the build can't tell where `first(User)` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type a Vue template reads", () => {
			const user = {
				"/a.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
			}
			// as @vue/compiler-sfc writes script setup, setup() and data()
			attest(
				unhinted(
					`import { unref as _unref, toDisplayString as _toDisplayString } from "vue"
import { User } from "./a.ts"
export default {
	setup: () => (_ctx: unknown) => _toDisplayString(_unref(User).description)
}`,
					user
				)
			).snap([
				"/main.ts:4:51  _unref(User).description reads description, which a standalone validator lacks\n  `_unref(User)` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read"
			])
			attest(
				unhinted(
					`import { toDisplayString as _toDisplayString } from "vue"
import { User } from "./a.ts"
const _sfc_main = { setup: () => ({ Schema: User }), data: () => ({ product: { description: "" } }) }
export function render(_ctx: any, _cache: any, $props: any, $setup: any) {
	return [$setup.Schema.description, _ctx.product.description, $setup.Schema.allows(1)].map(_toDisplayString)
}`,
					user
				)
			).snap([
				"/main.ts:5:10  $setup.Schema.description reads description, which a standalone validator lacks\n  the build can't tell where `$setup.Schema` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
			])
		})

		it("a Type a TypeScript namespace exports", () => {
			attest(
				unhinted(`import { type } from "arktype"
namespace Schemas {
	export const User = type({ name: "string" })
	export namespace Inner {
		export const Admin = type({ role: "string" })
	}
}
namespace A.B {
	export const T = type("string")
}
function f() {}
namespace f {
	export const T = type("number")
}
console.log(Schemas.User.or("null"), Schemas.User.expression)
console.log(Schemas.Inner.Admin.or("null"), A.B.T.or("null"), f.T.or("null"))
console.log(Schemas.User({}), Schemas.User.allows(1))`)
			).snap([
				"/main.ts:15:13  Schemas.User.or reads or, which a standalone validator lacks\n  the build can't tell where `Schemas.User` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:15:38  Schemas.User.expression reads expression, which a standalone validator lacks\n  the build can't tell where `Schemas.User` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:16:13  Schemas.Inner.Admin.or reads or, which a standalone validator lacks\n  the build can't tell where `Schemas.Inner.Admin` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:16:45  A.B.T.or reads or, which a standalone validator lacks\n  the build can't tell where `A.B.T` comes from, so it may be a Type, which the standalone runtime replaces with a validator",
				"/main.ts:16:63  f.T.or reads or, which a standalone validator lacks\n  the build can't tell where `f.T` comes from, so it may be a Type, which the standalone runtime replaces with a validator"
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
				"/main.ts:3:29  (v as any).from reads from, which a standalone validator lacks\n  the build can't tell where `v as any` comes from, so it may be a Type, which the standalone runtime replaces with a validator\n  If it isn't a Type, annotate it with an interface or type literal declaring what it reads, since the build can't read `any`. If it is, leave members[\"methods\"] unset."
			])
		})

		it("options a build can't take", () => {
			const refused: [opts: PrecompileOptions, message: string][] = [
				[
					{ members: { json: true, and: true } as never },
					"members.and must be removed (was true)"
				],
				[
					{ members: { "~standard": false, "~standard.jsonSchema": true } },
					'members bakes "~standard.jsonSchema" into "~standard", which it sets false. Leave "~standard" unset, or remove "~standard.jsonSchema".'
				],
				[
					{ config: true as never },
					"config must be a module path or false (was true)"
				],
				[{ config: "" }, 'config must be a module path or false (was "")'],
				[{ freeze: 0 as never }, "freeze must be boolean (was 0)"],
				[
					{ creationChecks: "all" as never },
					'creationChecks must be "helpers", "none" or "types" (was "all")'
				],
				[
					{ optimise: "size" } as never,
					'optimise must be removed (was "size")'
				],
				[
					{ runtime: "arktype", freeze: true },
					writeArktypeRuntimeOptionMessage("freeze")
				],
				[{ shadow: "true" as never }, 'shadow must be boolean (was "true")'],
				[
					{ runtime: "arktype", jsonInput: true },
					writeArktypeRuntimeOptionMessage("jsonInput")
				],
				[
					{ runtime: "arktype", shadow: true },
					writeArktypeRuntimeOptionMessage("shadow")
				],
				[
					{ runtime: "arktype", config: false },
					'config: false chooses what a standalone build writes, which runtime: "arktype" doesn\'t. Remove runtime: "arktype" to precompile, or remove config: false.'
				]
			]
			for (const [opts, message] of refused)
				attest(() => new Precompiler(memoryHost({}), opts)).throws(message)
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

		it("a Scope or Generic read off a value the build can't follow", () => {
			attest(
				diagnosticsOf(`import { scope, type, type Generic, type Scope } from "arktype"
const getPlaces = () => scope({ ocean: { color: "'blue'" } })
const $ = getPlaces()
export const Ocean = $.type("ocean")
export const Place = getPlaces().type("ocean")
const defined = scope({ a: "string" })
export const viaTypeof = (s: typeof defined) => s.type("a")
export const viaScope = (s: Scope) => s.export()
const G = type("<t>", { t: "t" })
const getG = () => G
export const params = getG().params
export const names = (flag: boolean) => (flag ? G : type("<u>", { u: "u" })).names
export const viaGeneric = (g: Generic) => g.params`)
			).snap([
				'/main.ts:5:22  getPlaces().type("ocean") can\'t be precompiled yet\n  `getPlaces()` may be a Scope, which a standalone build replaces with an object that lacks `type`\n  Assign it to a const and read `type` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:7:49  s.type("a") can\'t be precompiled yet\n  `s` may be a Scope, which a standalone build replaces with an object that lacks `type`\n  Assign it to a const and read `type` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:8:39  s.export() can\'t be precompiled yet\n  `s` may be a Scope, which a standalone build replaces with an object that lacks `export`\n  Assign it to a const and read `export` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:11:23  getG().params can\'t be precompiled yet\n  `getG()` may be a Generic, which a standalone build replaces with an object that lacks `params`\n  Assign it to a const and read `params` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:12:41  (flag ? G : type("<u>", { u: "u" })).names can\'t be precompiled yet\n  `flag ? G : type("<u>", { u: "u" })` may be a Generic, which a standalone build replaces with an object that lacks `names`\n  Assign it to a const and read `names` off that, which the build precompiles, or build with runtime: "arktype".',
				'/main.ts:13:43  g.params can\'t be precompiled yet\n  `g` may be a Generic, which a standalone build replaces with an object that lacks `params`\n  Assign it to a const and read `params` off that, which the build precompiles, or build with runtime: "arktype".'
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

		it("a Scope handed on in a literal, binding or object", () => {
			attest(
				escapesOf(`import { scope } from "arktype"
declare const each: (value: unknown) => void
each({ s: scope({ a: "string" }) })
const listed = scope({ b: "string" })
each([listed])
const nested = scope({ c: "string" })
const options = { defs: [{ nested }] }
each(options)
const spread = scope({ d: "string" })
each([...[spread]])
each({ ...{ spread: scope({ e: "string" }) } })
let assigned: unknown
assigned = scope({ f: "string" })
each(assigned)
const $ = scope({ g: "string" })
let reassigned: unknown = 1
reassigned = $
each(reassigned)
var declared = scope({ h: "string" })
each(declared)
let read = scope({ i: "string" })
export const I = read.type("i")
const target: Record<string, unknown> = {}
target.s = scope({ j: "string" })
class Fields {
	s = scope({ k: "string" })
}
each(new Fields())
const assignedTo = scope({ l: "string" })
each(Object.assign({}, { assignedTo }))
const got = scope({ m: "string" })
each({
	get got() {
		return got
	}
})`)
			).snap([
				"3:11",
				"4:16",
				"6:16",
				"9:16",
				"11:21",
				"13:12",
				"15:11",
				"19:16",
				"24:12",
				"26:6",
				"29:20",
				"31:13"
			])
		})

		it("a Scope read off a literal, copied or tested", () => {
			attest(
				escapesOf(`import { scope } from "arktype"
const list = [scope({ a: "string" })]
export const A = (i: number) => list[i].type("a")
const options = { s: scope({ b: "string" }) }
const read = (o: typeof options) => o.s.type("b")
export const B = read(options)
for (const s of [scope({ c: "string" })]) s.type("c")
const kept = { s: scope({ d: "string" }) }
export const D = kept.s.type("d")
const indexed = [scope({ e: "string" })]
export const E = indexed[0].type("e")
const $ = scope({ f: "string" })
export const copy = { ...$ }
const keyed = scope({ g: "string" })
export const has = "type" in keyed
const { type: t } = scope({ h: "string" })
export const H = t
const compared = scope({ i: "string" })
export const isDefined = compared !== undefined && typeof compared === "object"`)
			).snap(["2:15", "4:22", "7:18", "7:43 type", "12:11", "14:15", "16:21"])
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
			const optedIn = escapesOf(
				source,
				files({ name: "lib", ark: { aot: true } })
			)
			attest(optedIn).snap([
				"6:6",
				"7:6 Generic",
				"8:6",
				"9:6",
				"10:6",
				"11:6",
				"12:6",
				"15:6"
			])
			// a package that doesn't opt in isn't precompiled, so its Scope is arktype's
			attest(escapesOf(source, files({ name: "lib" }))).equals(
				optedIn.slice(0, -1)
			)
		})

		it("a Scope exported where its importers can't read it", () => {
			attest(
				escapesOf(`import { scope } from "arktype"
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
			).snap(["3:11", "5:11", "7:22", "8:11", "9:27"])
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
				"6:18 accepted string & fn$hole_mf73o516za619",
				'7:18 rejected\n  `__defProp(target, "name", { value, configurable: true })` defines a property other than the name of a function its module created',
				'8:18 rejected\n  `__defProp((s: string) => s.length < 3, "name", { value: "sh…` defines a property other than the name of a function its module created',
				'9:18 rejected\n  `__defProp((s: string) => s.length < 3, "length", { value: 2…` defines a property other than the name of a function its module created',
				'10:18 rejected\n  `__defProp({ a: "string" }, "name", { value: "o", configurab…` defines a property other than the name of a function its module created'
			])
		})

		it("conversions of objects", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const isLong = (s: string) => s.length > 3
class Apple {}
class Zebra {}
const Ap = type.instanceOf(Apple)
const Z = type.instanceOf(Zebra)
const pick = ({ [Ap as never]: v }: Record<string, string>) => v
const o = { toString: () => "12" }
const A = type({ a: type("string").narrow(isLong) }).configure({ description: "selected" }, { where: n => [n].join("").includes("isLong") })
const B = type([Ap, Z].join("") === "Type<Apple>Type<Zebra>" ? "string" : "number")
const D = type(Object.keys(Object.fromEntries([[Ap, 1]]))[0] === "Type<Apple>" ? "string" : "number")
const H = type(pick({ "Type<Apple>": "string" }) ?? "number")
const J = type({ [["a", "b"].join("")]: "string", ["abc".replace(/b/, "").split(/c/)[0]]: "string", ["x".replace("x", s => s + "y")]: "string" })
const K = type([Ap, Z].map(t => t).at(1)!)
const replacer = (k: string, v: any) => (k === "" ? { a: Ap } : k === "a" ? v.proto.includes("Apple") : v)
const M = type(JSON.stringify(0, replacer) === '{"a":true}' ? "string" : "number")
const N = type({ [parseInt(o as never)]: "string" })
const P = type({ [Number.parseFloat(o as never)]: "string" })
const Q = type({ [Number.parseInt("12")]: "string" })`)
			).snap([
				"5:12 accepted Apple$hole_1c2w4i12760ad",
				"6:11 accepted Zebra$hole_tlxgt0061ywqu",
				'9:11 rejected\n  arktype calls `where` (/main.ts:9:102) while defining the type, so it must be a static helper\n  `[n].join("")` converts an object to a primitive, which runs its methods',
				'10:11 rejected\n  `[Ap, Z].join("")` converts an object to a primitive, which runs its methods',
				"11:11 rejected\n  `Object.fromEntries([[Ap, 1]])` converts an object to a primitive, which runs its methods",
				"12:11 rejected\n  `Ap as never` converts an object to a primitive, which runs its methods",
				"13:11 accepted { a: string, ab: string, xy: string }",
				"14:11 accepted Zebra$hole_tlxgt0061ywqu",
				"16:11 rejected\n  `v: any` (/main.ts:15:30) receives the name of `Apple` (/main.ts:3:1), which the build knows only by a placeholder",
				"17:11 rejected\n  `parseInt(o as never)` converts an object to a primitive, which runs its methods",
				"18:11 rejected\n  `Number.parseFloat(o as never)` converts an object to a primitive, which runs its methods",
				"19:11 accepted { 12: string }"
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

		it("results that depend on the engine", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const A = type("Date").atOrAfter(Date.now())
const B = type(\`'\${process.argv[2]}'\`)
const C = type(\`number < \${Math.random()}\`)
const D = type(\`'\${(1000).toLocaleString()}'\`)
const E = type("Date").atOrAfter(new Date("2020-01-01T00:00:00"))
const F = type(\`number < \${2 ** 0.5}\`)
const G = type({ ["ß".toUpperCase()]: "string" })
const H = type({ ["abc".toUpperCase()]: "string" })`)
			).snap([
				"2:11 rejected\n  `Date.now` is not one of the build's pure built-ins",
				"3:11 rejected\n  `process` is a global the build does not read",
				"4:11 rejected\n  `Math.random` is not one of the build's pure built-ins",
				"5:11 rejected\n  `(1000).toLocaleString` is not one of the build's pure built-ins",
				'6:11 rejected\n  `new Date("2020-01-01T00:00:00")` reads the clock, the time zone or a format each engine parses its own way',
				"7:11 rejected\n  `2 ** 0.5` is approximated by each engine unless its operands are integers with a safe integer result",
				'8:11 rejected\n  `"ß".toUpperCase()` maps characters by the engine\'s Unicode version, which varies outside ASCII',
				"9:11 accepted { ABC: string }"
			])
		})

		it("reads that run code or aren't own data", () => {
			attest(
				statusesOf(`import { type } from "arktype"
const limits = { max: 5 }
const A = type({ get a() { return "string" } })
const B = type({ __proto__: null, a: "string" })
const C = type(\`'\${limits.toString}'\`)
const D = type(\`'\${limits.constructor.name}'\`)`)
			).snap([
				'3:11 rejected\n  `get a() { return "string" }` is an accessor, which runs code when arktype reads the definition',
				"4:11 rejected\n  a `__proto__` key changes the object's prototype",
				"5:11 rejected\n  `limits.toString` does not read an own data property",
				"6:11 rejected\n  `limits.constructor` does not read an own data property"
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

		it("excluded arktype members", () => {
			attest(
				statusesOf(`import { generic, scope, type } from "arktype"
const User = type({ name: "string" })
const A = type(\`'\${User.id}'\`)
const B = type(JSON.stringify(User.json))
const C = type(\`'\${JSON.stringify(User)}'\`)
const E = type(User.internal.is("intersection") ? "string" : "number")
const $ = scope({ a: "string" })
const Gen = generic("t")(["t", "[]"])
const Self = type({ a: "string", "b?": "this" })
const H = type(\`'\${$.name}'\`)
const I = type(\`'\${Object.keys($.byId).join("|")}'\`)
const K = type(\`'\${Self.internal.select({ kind: "alias" })[0].reference}'\`)
const M = type($.export().a)
const N = type(Gen.names.length === 1 ? "string" : "number")`)
			).snap([
				"2:14 accepted { name: string }",
				"3:11 rejected\n  `User.id` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"4:11 rejected\n  `User.json` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"5:11 rejected\n  `JSON.stringify(User)` stringifies a function or arktype value",
				"6:11 accepted string",
				"7:11 rejected\n  type(`'${$.name}'`) (/main.ts:10:11) reads `$` but isn't precompiled, so arktype must define `$` for it",
				"8:13 accepted",
				"9:14 accepted { a: string, b?: this }",
				"10:11 rejected\n  `$.name` is not a documented member its content alone decides, so it can depend on registry names or node ids",
				"11:11 rejected\n  `$.byId` is not a documented member its content alone decides, so it can depend on registry names or node ids",
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

	it("parse errors", () => {
		const parseErrorsOf = (opts?: PrecompileOptions) =>
			analyze(
				`import { type } from "arktype"
const A = type({ a: "1" }).and({ a: "2" })`,
				{},
				opts
			).diagnostics.map(d => `${d.severity} ${renderDiagnostic(d)}`)
		const failed = parseErrorsOf()
		attest(failed).snap([
			'error /main.ts:2:11  type({ a: "1" }).and({ a: "2" }) throws a ParseError\n  Intersection at a of 1 and 2 results in an unsatisfiable type\n  Fix the definition, which throws the same ParseError at runtime, or set allowUnsafe: true to build anyway, with a warning.'
		])
		attest(parseErrorsOf({ runtime: "arktype" })).equals(failed)
		attest(parseErrorsOf({ allowUnsafe: true })).snap([
			'warning /main.ts:2:11  type({ a: "1" }).and({ a: "2" }) throws a ParseError\n  Intersection at a of 1 and 2 results in an unsatisfiable type\n  Fix the definition, which throws the same ParseError at runtime.'
		])
		// any other error rejects the site
		attest(
			statusesOf(`import { type } from "arktype"
const read = (o: any) => o.a.b
const A = type(read({}))`)
		).snap([
			"3:11 rejected\n  `o.a.b` reads a property of undefined, which throws"
		])
	})
})
