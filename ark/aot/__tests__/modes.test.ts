import { attest, contextualize } from "@ark/attest"
import { configureAfterTypeMessage } from "@ark/schema"
import { precompileModule, renderDiagnostic } from "@ark/aot"
import { isRuntimeExport } from "@ark/aot/internal/graph.ts"
import { configuredThreadMessage } from "@ark/aot/internal/messages.ts"
import * as arktype from "arktype"
import { type } from "arktype"
import * as arktypeRuntime from "arktype/internal/runtimeExports.ts"
import {
	analyze,
	diagnosticsOf,
	inFreshProcess,
	memoryHost,
	normalized,
	precompile
} from "./utils.ts"

const main =
	'import { type } from "arktype"\nexport const T = type({ a: "string" })'

contextualize(function (this: Mocha.Suite) {
	// each fresh process loads arktype and the precompiler
	this.timeout(60_000)

	describe("configuration", () => {
		it("configure where the build can't apply it", () => {
			const once = `import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })`
			attest([
				...diagnosticsOf(once, {}, { config: "/config.ts" }),
				...diagnosticsOf(once),
				...diagnosticsOf(once, {}, { config: false }),
				...diagnosticsOf(
					`${once}\nconfigure({ numberAllowsNaN: true })`,
					{},
					{
						config: "/main.ts"
					}
				)
			]).snap([
				"/main.ts:2:1  configure() is called outside the config module /config.ts\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
				'/main.ts:2:1  configure() is called, but the build has no `config` module\n  Name this module as the build\'s config in ark.json: { "precompile": { "config": "/main.ts" } }',
				"/main.ts:2:1  configure() is called, but the build's `config` is false\n  Remove the call, or name its module as the build's `config`.",
				"/main.ts:3:1  configure() is called more than once\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("bakes an unevaluable configured JSON Schema writer as a thrower", () => {
			attest(
				inFreshProcess(async () => {
					const { precompile } = await import("./utils.ts")
					const files = {
						"/config.ts":
							'import { configure } from "arktype/config"\nimport { type } from "arktype"\nexport const shared = { version: 1 }\nexport const flags = { strict: true }\nconfigure({ toJsonSchema: { fallback: { predicate: ctx => ({ ...ctx.base, version: shared.version }), date: ctx => { let { base } = ctx; return base }, unit: ctx => (flags.strict ? type("nope") : ctx.base) } } })'
					}
					const source =
						'import { type } from "arktype"\nconst isEven = (n: number) => n % 2 === 0\nexport const Even = type("number").narrow(isEven)\nexport const At = type("Date")\nexport const Big = type("1n")\nexport const schema = Even.toJsonSchema()'
					const { code, modules } = precompile(source, files, {
						config: "/config.ts",
						members: { toJsonSchema: true }
					})
					const unbaked = Object.values(modules)
						.join("\n")
						.matchAll(/runtime\.throwUnbaked\((".*?[^\\]")\)/g)
					return [
						// the site compares what the writer read where the schema is read
						code
							.split("\n")
							.find(line => line.startsWith("export const schema"))!
							.replace(/\$ark\w+/g, "$ark"),
						...[...unbaked].map(([, reason]) => JSON.parse(reason))
					]
				})
			).snap([
				"export const schema = $ark($ark)",
				"a JSON Schema whose configured writer the build can't evaluate can't be precompiled to a standalone validator: arktype calls `date` (/config.ts:5:109) while defining the type, so it must be a static helper: `date` (/config.ts:5:109) is not a static helper: it runs `let { base } = ctx;` (/config.ts:5:118), where a static helper declares only consts before one `return`",
				"a JSON Schema whose configured writer reads `flags.strict`, which the program can change, can't be precompiled to a standalone validator",
				"a JSON Schema whose configured writer reads `shared.version`, which the program can change, can't be precompiled to a standalone validator"
			])
		})

		it("configure in a thread where arktype has created a Type", () => {
			type("string")
			attest(() =>
				precompile(
					`import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })`,
					{},
					{ config: "/main.ts" }
				)
			).throws(
				"arktype in this thread holds a configuration other than the build's, which it can't change once set, so the build must restart in a thread of its own. Restart the process that runs it."
			)
		})

		it("configure in a thread another configuration reached", () => {
			attest(
				inFreshProcess(
					async (main: string) => {
						const { precompile } = await import("./utils.ts")
						const outcomeOf = (argument?: string) => {
							try {
								precompile(
									main,
									argument === undefined ?
										{}
									:	{
											"/config.ts": `import { configure } from "arktype/config"\n${argument}`
										},
									argument === undefined ? {} : { config: "/config.ts" }
								)
								return "precompiled"
							} catch (e) {
								return (e as Error).message
							}
						}
						return [
							outcomeOf('configure({ onUndeclaredKey: "delete" })'),
							outcomeOf('configure({ onUndeclaredKey: "delete" })'),
							outcomeOf(),
							outcomeOf('configure({ onUndeclaredKey: "reject" })')
						]
					},
					[main]
				)
			).equals([
				"precompiled",
				"precompiled",
				configuredThreadMessage,
				configuredThreadMessage
			])
		})

		it("configure in a thread after a build applied its configuration", () => {
			for (const opts of [{}, { config: "/config.ts" }]) {
				attest(
					inFreshProcess(
						async (main: string, opts: object) => {
							const { precompile } = await import("./utils.ts")
							const { configure } = await import("arktype")
							const configured = {
								"/config.ts":
									'import { configure } from "arktype/config"\nconfigure({ exactOptionalPropertyTypes: false })'
							}
							precompile("export const x = 1", configured, opts)
							let outcome = "configured"
							try {
								configure({ onUndeclaredKey: "delete" })
							} catch (e) {
								outcome = (e as Error).message
							}
							const { code, modules } = precompile(main, configured, opts)
							return [
								outcome,
								[code, ...Object.values(modules)]
									.join("")
									.includes("undeclared")
							]
						},
						[main, opts]
					)
				).equals([configureAfterTypeMessage, false])
			}
		})

		it("analyzes a module under the configuration its thread holds", () => {
			attest(
				inFreshProcess(
					async (main: string) => {
						const { memoryHost, precompile } = await import("./utils.ts")
						const { Precompiler } = await import("@ark/aot")
						const configured = {
							"/config.ts":
								'import { configure } from "arktype/config"\nconfigure({ onUndeclaredKey: process.argv.length > 99 ? "delete" : "reject" })'
						}
						const opts = { config: "/config.ts" }
						precompile("export const x = 1", configured, opts)
						const precompiler = new Precompiler(
							memoryHost({ ...configured, "/main.ts": main }),
							opts
						)
						return [
							precompiler.analyzeSites(main, "/main.ts"),
							precompiler.precompile(main, "/main.ts")
						].map(({ sites }) => sites.map(site => site.status))
					},
					[main]
				)
			).equals([["rejected"], ["rejected"]])
		})

		it("configure given anew", () => {
			attest(
				inFreshProcess(
					async (main: string) => {
						const { memoryHost } = await import("./utils.ts")
						const { Precompiler, renderDiagnostic } = await import("@ark/aot")
						const config =
							'import { configure } from "arktype/config"\nconfigure({ onUndeclaredKey: "reject" })'
						const precompiler = new Precompiler(
							memoryHost({ "/config.ts": config, "/main.ts": main }),
							{ config: "/config.ts" }
						)
						return [
							["/main.ts", main],
							// the same values, written otherwise
							["/config.ts", config.replace(/ /g, "")],
							["/config.ts", config.replace("reject", "delete")],
							["/main.ts", main]
						].map(([id, source]) =>
							precompiler
								.precompile(source, id)
								.diagnostics.map(renderDiagnostic)
						)
					},
					[main]
				)
			).snap([
				[],
				[],
				[
					"/config.ts:2:1  configure() is given other values than arktype in this thread already applied\n  a module the configuration reads was given anew, as when it's edited while the build runs or a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set\n  Restart the build to apply an edit to /config.ts. If it wasn't edited, put arktype's plugin ahead of the plugin transforming it."
				],
				[
					"/main.ts:2:18  type({ a: \"string\" }) is created under a configuration the build can't apply\n  configure() is given other values than arktype in this thread already applied (/config.ts)\n  a module the configuration reads was given anew, as when it's edited while the build runs or a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set\n  Restart the build to apply an edit to /config.ts. If it wasn't edited, put arktype's plugin ahead of the plugin transforming it."
				]
			])
		})

		it("says once in a module why it can't apply a configuration", () => {
			attest(
				inFreshProcess(async () => {
					const { Precompiler, renderDiagnostic } = await import("@ark/aot")
					const { memoryHost } = await import("./utils.ts")
					const config =
						'import { configure } from "arktype/config"\nconfigure({ onUndeclaredKey: process.env.X ? "delete" : "ignore" })'
					const main =
						'import "./config.ts"\nimport { type } from "arktype"\nexport const A = type({ a: "string" })\nexport const B = type({ b: "number" })'
					return new Precompiler(
						memoryHost({ "/config.ts": config, "/main.ts": main }),
						{ config: "/config.ts" }
					)
						.precompile(main, "/main.ts")
						.diagnostics.map(renderDiagnostic)
				})
			).snap([
				'/main.ts:3:18  type({ a: "string" }) is created under a configuration the build can\'t apply\n  configure({ onUndeclaredKey: process.env.X ? "delete" : "ig… is not static (/config.ts)\n  `process` is a global the build does not read\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.',
				'/main.ts:4:18  type({ b: "number" }) is created under a configuration the build can\'t apply\n  for the reasons given at /main.ts:3:18'
			])
		})

		it("configure with an argument that creates a Type", () => {
			attest(
				inFreshProcess(async () => {
					const { precompile } = await import("./utils.ts")
					const { renderDiagnostic } = await import("@ark/aot")
					const config =
						'import { configure } from "arktype/config"\nimport { Email } from "./email.ts"\n\nconfigure({ keywords: { "string.email": `${Email.expression}!` } })'
					const { diagnostics } = precompile(
						config,
						{
							"/email.ts":
								'import { type } from "arktype"\nexport const Email = type("string.email")'
						},
						{ config: "/main.ts" }
					)
					return diagnostics.map(renderDiagnostic)
				})
			).snap([
				"/main.ts:4:1  configure() is called after its argument creates a Type\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
				"/main.ts:4:44  Email.expression is created under a configuration the build can't apply\n  configure() is called after its argument creates a Type (/main.ts)\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("configure with an object a module writes or exports", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
import { shared } from "./shared.ts"
const written = { description: "one" }
configure({ keywords: { string: written, number: shared, boolean: { description: "inline" } } })
written.description = "two"`,
					{ "/shared.ts": 'export const shared = { description: "a" }' },
					{ config: "/main.ts" }
				)
			).snap([
				'/main.ts:4:1  configure({ keywords: { string: written, number: shared, bo… is not static\n  `shared` is exported from /shared.ts, so another module can write what the configuration holds: declare it in the call instead\n  `written.description = "two"` (/main.ts:5:1) writes what the configuration holds: declare the value in the call instead'
			])
		})

		it("configure with a namespace import", () => {
			const files = { "/mode.ts": 'export const onUndeclaredKey = "reject"' }
			attest(
				[
					"configure(kw)",
					"configure({ keywords: kw })",
					"configure({ ...kw })"
				].flatMap(call =>
					diagnosticsOf(
						`import { configure } from "arktype/config"
import * as kw from "./mode.ts"
${call}`,
						files,
						{ config: "/main.ts" }
					)
				)
			).snap([
				"/main.ts:3:1  configure(kw) is not static\n  a namespace import used as a value is not in the static subset: import what it exports by name, or declare an object it exports in the call",
				"/main.ts:3:1  configure({ keywords: kw }) is not static\n  a namespace import used as a value is not in the static subset: import what it exports by name, or declare an object it exports in the call",
				"/main.ts:3:1  configure({ ...kw }) is not static\n  `...kw` spreads a value other than an object literal or Module\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("configure in a declaration or default export", () => {
			attest(
				[
					"const config = configure({ onFail: errors => errors.throw() })",
					"export const config = configure({ onFail: errors => errors.throw() }) as {}",
					"export default configure({ onFail: errors => errors.throw() })",
					"void configure({ onFail: errors => errors.throw() })"
				].flatMap(call =>
					diagnosticsOf(
						`import { configure } from "arktype/config"
${call}`,
						{},
						{ config: "/main.ts" }
					)
				)
			).snap([])
		})

		it("configure's value written after the call", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
const config = configure({ keywords: { string: { description: "one" } } }) as any
export const later = () => {
	config.keywords.string.description = "two"
	config.keywords.number = "a number"
}`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				'/main.ts:2:16  configure({ keywords: { string: { description: "one" } } }) is not static\n  `config.keywords.string.description = "two"` (/main.ts:4:2) writes what the configuration holds: declare the value in the call instead\n  `config.keywords.number = "a number"` (/main.ts:5:2) writes what the configuration holds: declare the value in the call instead'
			])
		})

		it("hints keywords configured with functions as any other", () => {
			attest(
				inFreshProcess(async () => {
					const { memoryHost } = await import("./utils.ts")
					const { Precompiler } = await import("@ark/aot")
					const files = {
						"/config.ts":
							'import { configure } from "arktype/config"\nconfigure({ keywords: { string: { expected: () => "text" }, number: { custom: Symbol.for("x") } } } as any)',
						"/main.ts":
							'import { type } from "arktype"\nexport const T = type({ a: "string" }).describe(String(Math.random()))\nexport const U = type({ a: "number" }).describe(String(Math.random()))\nexport const V = type({ a: "string" })'
					}
					const { diagnostics } = new Precompiler(memoryHost(files), {
						config: "/config.ts"
					}).precompile(files["/main.ts"], "/main.ts")
					return diagnostics.map(diagnostic => diagnostic.hint)
				})
			).snap([
				"Replace `Math.random()` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.",
				"Replace `Math.random()` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.",
				"Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime."
			])
		})

		it("leaves an @ark-runtime configure() to islands", () => {
			attest(
				normalized(
					inFreshProcess(async () => {
						const { precompile } = await import("./utils.ts")
						const { renderDiagnostic } = await import("@ark/aot")
						const { code, diagnostics } = precompile(
							'import { configure, type } from "arktype"\n// @ark-runtime\nconfigure({ onUndeclaredKey: "delete" })\n// @ark-runtime\nexport const T = type({ name: process.argv[2] })',
							{},
							{ config: "/main.ts" }
						)
						return [code, ...diagnostics.map(renderDiagnostic)]
					})
				)
			).snap([
				'import "arktype/internal/island.js"\nimport * as $ark$island from "arktype/internal"\nimport { configure } from "arktype"\n// @ark-runtime\nconfigure({ onUndeclaredKey: "delete" }, "#0")\n// @ark-runtime\nexport const T = $ark$island.type({ name: process.argv[2] })'
			])
		})

		it("configure below the top level", () => {
			const setup = `import { configure } from "arktype/config"
export const setup = () => configure({ onUndeclaredKey: "reject" })`
			attest([
				...diagnosticsOf(
					`import { configure } from "arktype/config"
if (process.env.STRICT) configure({ onUndeclaredKey: "reject" })`,
					{},
					{ config: "/main.ts" }
				),
				...diagnosticsOf(setup, {}, { config: "/main.ts" }),
				...diagnosticsOf(
					`import { setup } from "./config.ts"
import { type } from "arktype"
setup()
export const A = type({ a: "string" })`,
					{ "/config.ts": setup },
					{ config: "/config.ts" }
				)
			]).snap([
				"/main.ts:2:25  configure() must be called once, unconditionally, at the config module's top level\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
				"/main.ts:2:28  configure() must be called once, unconditionally, at the config module's top level\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("configure with a symbol key the registry doesn't name", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
const local = Symbol("local")
configure({
	keywords: { string: { custom: { [local]: 1, [Symbol.for("shared")]: 2 } } },
	domain: { [Symbol.iterator]: 3 }
} as {})`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				"/main.ts:3:1  configure({ keywords: { string: { custom: { [local]: 1, [Sy… is not static\n  the symbol key Symbol(local) at /main.ts:2:15 must be a string or one Symbol.for() returns, since the runtime can't match another with the build's\n  the symbol key Symbol(Symbol.iterator) at /main.ts:5:13 must be a string or one Symbol.for() returns, since the runtime can't match another with the build's"
			])
		})

		it("configure with values that are not static", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
configure({ numberAllowsNaN: process.argv.includes("--nan") })`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				'/main.ts:2:1  configure({ numberAllowsNaN: process.argv.includes("--nan")… is not static\n  `process` is a global the build does not read\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.'
			])
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
const describe = (n: unknown) => {
	let text = "a number"
	return text
}
configure({ domain: { description: describe } })`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				"/main.ts:6:1  configure({ domain: { description: describe } }) is not static\n  the description writer at /main.ts:2:18 must be a static helper, since arktype calls it while defining types"
			])
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
const describe = (n: unknown) => {
	let text = "a number"
	return text
}
const meta = { description: describe }
configure({ number: meta, bigint: meta })`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				"/main.ts:7:1  configure({ number: meta, bigint: meta }) is not static\n  the description writer at /main.ts:2:18 must be a static helper, since arktype calls it while defining types"
			])
		})

		it("a Type created before the configuration", () => {
			attest(
				diagnosticsOf(
					`import { configure, type } from "arktype"
export const Early = type("string")
configure({ onUndeclaredKey: "delete" })
export const Late = type("string")`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				'/main.ts:2:22  type("string") is created while the config module loads, before configure() runs\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.'
			])
			const opts = { config: "/config.ts" }
			const main = `import { type } from "arktype"
export const Name = type("string")
export type Name = typeof Name.infer`
			const configImporting = (typeImport: string) => ({
				"/config.ts": `import { configure } from "arktype/config"
${typeImport}
configure({ onUndeclaredKey: "delete" })`
			})
			attest(
				diagnosticsOf(
					main,
					configImporting('import type { Name } from "./main.ts"'),
					opts
				)
			).equals([])
			// type stripping and `verbatimModuleSyntax` keep type-only imports
			for (const typeImport of [
				'import { type Name } from "./main.ts"',
				'import { Name } from "./main.ts"\nexport const name: Name = "x"'
			]) {
				attest(diagnosticsOf(main, configImporting(typeImport), opts)).snap([
					'/main.ts:2:21  type("string") is created while the config module loads, before configure() runs\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.'
				])
			}
			const config = {
				"/config.ts": `import { configure } from "arktype/config"
import { suffix } from "./main.ts"
configure({ keywords: { "string.email": \`an address\${suffix}\` } })`
			}
			// the entry decides whether this module or the config module runs first
			attest(
				diagnosticsOf(
					`import "./config.ts"
import { type } from "arktype"
export const suffix = "!"
export const Name = type("string")`,
					config,
					opts
				)
			).equals([])
		})
	})

	it("syntax errors", () => {
		attest(diagnosticsOf("export const = 5")).snap([
			"/main.ts:1:1  /main.ts cannot be parsed: Unexpected token"
		])
		attest(
			precompileModule("return", "/main.cjs", memoryHost({})).diagnostics
		).equals([])
	})

	describe("standalone", () => {
		it("builds a module alike whichever module it builds first", () => {
			// a fresh process for each order, so nothing one build cached reaches the other
			const build = (paths: string[]) =>
				inFreshProcess(
					async (paths: string[]) => {
						const { memoryHost } = await import("./utils.ts")
						const { Precompiler } = await import("@ark/aot")
						const files: Record<string, string> = {
							"/a.ts":
								'import { type } from "arktype"\nexport const A = type({ x: "number", y: "number" }).onUndeclaredKey("delete")',
							"/b.ts":
								'import { type } from "arktype"\nexport const B = type({ y: "number", x: "number" }).onUndeclaredKey("delete")'
						}
						const precompiler = new Precompiler(memoryHost(files))
						const built: Record<string, string[]> = {}
						for (const path of paths) {
							const { code, modules } = precompiler.precompile(
								files[path],
								path
							)
							built[path] = [code, ...Object.values(modules)]
						}
						return built
					},
					[paths]
				)
			const aFirst = build(["/a.ts", "/b.ts"])
			attest(build(["/b.ts", "/a.ts"])).equals(aFirst)
			attest(
				Object.entries(aFirst).map(([path, written]) => [
					path,
					...written.flatMap(code => code.match(/const result = .+/g) ?? [])
				])
			).snap([
				["/a.ts", 'const result = { "x": null, "y": null }'],
				["/b.ts", 'const result = { "y": null, "x": null }']
			])
		})

		it("arktype used outside a site", () => {
			const source = `import * as ark from "arktype"
const A = ark.type({ a: "string" })
export const isError = (data: unknown) => data instanceof ark.ArkErrors
export const make = (def: string) => {
	const T = ark["type"](def)
	return T
}`
			attest(analyze(source).sites.map(site => site.kind)).snap(["type"])
			attest(diagnosticsOf(source)).snap([
				'/main.ts:5:12  `ark` is used outside a precompiled site\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
			// re-exporting it isn't using it
			attest(
				diagnosticsOf(`import { type, scope } from "arktype"
export { type }
export default scope`)
			).equals([])
		})

		it("calls at runtime each arktype export its runtime shares", () => {
			// but type, whose runtime copy holds only errors
			attest(
				Object.keys(arktype).filter(
					name => name in arktypeRuntime && !isRuntimeExport(name)
				)
			).equals(["type"])
			attest(
				diagnosticsOf(`import { firstIssue, type } from "arktype"
const User = type({ name: "string" })
export const messageOf = (data: unknown) => {
	const out = User(data)
	return out instanceof type.errors ? firstIssue(out).message : ""
}`)
			).equals([])
		})

		it("writes to arktype values", () => {
			const source = `import { type, scope } from "arktype"
const T = type({ a: "string" })
const $ = scope({ sub: type.module({ a: "string" }) })
;(type as any).or = () => T
;(T as any).meta.note = "x"
delete (T as any).description
Object.defineProperty(T, "x", { value: 1 })
Reflect.set($.export().sub, "a", T)
;($.export().sub as any).a = T
export const U = Object.assign(type("string"), { create: () => "" })
const box: any = { T }
box.T.x = 1
box.T = 1
export const parse = (data: unknown) => {
	const out: any = T(data)
	out.a = "checked"
	return out
}`
			const diagnostics = analyze(source).diagnostics.filter(d =>
				d.message.includes("writes to")
			)
			attest(diagnostics.map(d => `${d.line}:${d.column} ${d.message}`)).snap([
				"4:2 (type as any).or = () => T writes to an arktype value, which throws at runtime",
				'5:2 (T as any).meta.note = "x" writes to what an arktype value holds, which throws at runtime',
				"6:1 delete (T as any).description writes to an arktype value, which throws at runtime",
				'7:1 Object.defineProperty(T, "x", { value: 1 }) writes to an arktype value, which throws at runtime',
				'8:1 Reflect.set($.export().sub, "a", T) writes to an arktype value, which throws at runtime',
				"9:2 ($.export().sub as any).a = T writes to an arktype value, which throws at runtime",
				'10:18 Object.assign(type("string"), { create: () => "" }) writes to an arktype value, which throws at runtime',
				"12:1 box.T.x = 1 writes to an arktype value, which throws at runtime"
			])
			attest(renderDiagnostic(diagnostics[0]))
				.snap(`/main.ts:4:2  (type as any).or = () => T writes to an arktype value, which throws at runtime
  \`type\` is an arktype value, which the standalone runtime freezes with what it holds
  Keep what you attach in an object of your own, or build with runtime: "arktype".`)
			attest(diagnosticsOf(source, {}, { runtime: "arktype" })).snap([])
		})

		it("cache mode reports without rejecting", () => {
			const source = `import { type } from "arktype"
const make = type
export const field = (limit: number) => {
	let Field = type(\`string <= \${limit}\`)
	return Field
}`
			attest(
				analyze(source).diagnostics.map(d => `${d.rule} ${d.severity}`)
			).snap(["R4 error", "R1 error"])
			attest(diagnosticsOf(source, {}, { runtime: "arktype" })).snap([
				'/main.ts:4:14  type(`string <= ${limit}`) cannot be precompiled\n  `limit` is a parameter of field (/main.ts:3:23); its value is known only at runtime\n  With runtime: "arktype", arktype defines this at runtime.'
			])
			// it holds no value the build cannot read
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
let def = "string"
def = "number"
export const T = type(def)`,
					{},
					{ runtime: "arktype" }
				)
			).snap([
				'/main.ts:4:18  type(def) cannot be precompiled\n  `def` is assigned at /main.ts:3:1, so its value at the site is not known\n  With runtime: "arktype", arktype defines this at runtime.'
			])
			// arktype tests `null` against `Cat` as it defines the type
			const tested = `import { type } from "arktype"
class Cat {}
export const A = type.instanceOf(Cat).or("null")`
			attest(
				analyze(tested, {}, { runtime: "arktype" }).diagnostics.map(
					d => `${d.rule} ${d.severity}`
				)
			).snap(["R1 warning"])
		})
	})
})
