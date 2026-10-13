import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { configureAfterTypeMessage } from "@ark/schema"
import {
	configuredThreadMessage,
	precompileModule,
	renderDiagnostic
} from "@ark/precompile"
import { type } from "arktype"
import { spawnSync } from "node:child_process"
import {
	analyze,
	diagnosticsOf,
	memoryHost,
	precompile,
	statusesOf
} from "./utils.ts"

// a process of its own, whose arktype has neither a configuration nor a Type
const printedInFreshThread = (script: string): unknown =>
	JSON.parse(
		spawnSync(
			process.execPath,
			["--conditions", "ark-ts", "--input-type=module"],
			{
				cwd: fromHere(),
				encoding: "utf8",
				input: `import { renderDiagnostic } from "@ark/precompile"
import { precompile } from "./utils.ts"

const main = 'import { type } from "arktype"\\nexport const T = type({ a: "string" })'
const outcomeOf = (files, opts) => {
	try {
		precompile(main, files, opts)
		return "precompiled"
	} catch (e) {
		return e.message
	}
}
${script}`
			}
		).stdout
	)

contextualize(() => {
	describe("configuration", () => {
		it("static configure in the config module", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
const max = 5
configure({
	exactOptionalPropertyTypes: false,
	number: { description: () => \`a number below \${max}\` },
	onFail: errors => errors.throw()
})`,
					{},
					{ config: "/main.ts" }
				)
			).snap([])
		})

		it("arktype/config exports only configure", () => {
			attest(
				statusesOf(`import { type } from "arktype/config"
export const T = type("string")`)
			).snap([])
		})

		it("configure outside the config module", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })`,
					{},
					{ config: "/config.ts" }
				)
			).snap([
				"/main.ts:2:1  configure() is called outside the config module /config.ts\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
			attest(
				diagnosticsOf(`import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })`)
			).snap([
				"/main.ts:2:1  configure() is called, but the build has no `config` module\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("configure more than once", () => {
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })
configure({ numberAllowsNaN: true })`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				"/main.ts:3:1  configure() is called more than once\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("bakes a JSON Schema whose configured writer reads what the program can change, returning or throwing, or can't be evaluated, as a thrower saying why", () => {
			attest(
				printedInFreshThread(`const files = {
	"/config.ts": 'import { configure } from "arktype/config"\\nimport { type } from "arktype"\\nexport const shared = { version: 1 }\\nexport const flags = { strict: true }\\nconfigure({ toJsonSchema: { fallback: { predicate: ctx => ({ ...ctx.base, version: shared.version }), date: ctx => { const { base } = ctx; return base }, unit: ctx => (flags.strict ? type("nope") : ctx.base) } } })'
}
const source = 'import { type } from "arktype"\\nconst isEven = (n: number) => n % 2 === 0\\nexport const Even = type("number").narrow(isEven)\\nexport const At = type("Date")\\nexport const Big = type("1n")\\nexport const schema = Even.toJsonSchema()'
const { code, modules } = precompile(source, files, { config: "/config.ts", introspection: ["toJsonSchema"] })
console.log(JSON.stringify([
	// the site compares what the writer read where the program reads the schema
	code.split("\\n").find(line => line.startsWith("export const schema")).replace(/\\$ark\\w+/g, "$ark"),
	...[...Object.values(modules).join("\\n").matchAll(/runtime\\.throwUnbaked\\((".*?[^\\\\]")\\)/g)].map(([, reason]) => JSON.parse(reason))
]))`)
			).snap([
				"export const schema = $ark($ark)",
				"a JSON Schema whose configured writer the build can't evaluate can't be precompiled to a standalone validator: arktype calls `date` (/config.ts:5:109) while defining the type, so it must be a static helper: `date` (/config.ts:5:109) is not a static helper: its body is not one expression or one `return`",
				"a JSON Schema whose configured writer reads `flags.strict`, which the program can change, can't be precompiled to a standalone validator",
				"a JSON Schema whose configured writer reads `shared.version`, which the program can change, can't be precompiled to a standalone validator"
			])
		}).timeout(60000)

		it("configure in a thread where arktype has created a Type", () => {
			type("string")
			attest(() =>
				precompile(
					`import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })`,
					{},
					{ config: "/main.ts" }
				)
			).throws(configuredThreadMessage)
		})

		it("configure in a thread another configuration reached", () => {
			attest(
				printedInFreshThread(`const configured = argument => ({
	"/config.ts": \`import { configure } from "arktype/config"\\n\${argument}\`
})
const opts = { config: "/config.ts" }
console.log(JSON.stringify([
	outcomeOf(configured('configure({ onUndeclaredKey: "delete" })'), opts),
	outcomeOf(configured('configure({ onUndeclaredKey: "delete" })'), opts),
	outcomeOf({}, {}),
	outcomeOf(configured(""), opts),
	outcomeOf(configured('configure({ onUndeclaredKey: "reject" })'), opts)
]))`)
			).equals([
				"precompiled",
				"precompiled",
				configuredThreadMessage,
				configuredThreadMessage,
				configuredThreadMessage
			])
			attest(
				printedInFreshThread(`import { configure } from "arktype"

configure({ onUndeclaredKey: "delete" })
console.log(JSON.stringify(outcomeOf({}, {})))`)
			).equals(configuredThreadMessage)
		}).timeout(60000)

		it("configure in a thread after a build applied its configuration", () => {
			const hostConfigures = `import { configure } from "arktype"

const configured = {
	"/config.ts": 'import { configure } from "arktype/config"\\nconfigure({ exactOptionalPropertyTypes: false })'
}
const precompiled = opts => {
	precompile("export const x = 1", configured, opts)
	let outcome = "configured"
	try {
		configure({ onUndeclaredKey: "delete" })
	} catch (e) {
		outcome = e.message
	}
	const { code, modules } = precompile(main, configured, opts)
	console.log(JSON.stringify([outcome, [code, ...Object.values(modules)].join("").includes("undeclared")]))
}`
			for (const opts of ["{}", '{ config: "/config.ts" }']) {
				attest(
					printedInFreshThread(`${hostConfigures}\nprecompiled(${opts})`)
				).equals([configureAfterTypeMessage, false])
			}
		}).timeout(60000)

		it("analyzes a module once in a thread another precompiler configured", () => {
			attest(
				printedInFreshThread(`import { Precompiler } from "@ark/precompile"
import { memoryHost } from "./utils.ts"

const configured = {
	"/config.ts": 'import { configure } from "arktype/config"\\nconfigure({ onUndeclaredKey: "reject" })'
}
const opts = { config: "/config.ts" }
precompile("export const x = 1", configured, opts)
const source = 'import { scope } from "arktype"\\nconst $ = scope({ a: () => 42 } as never) as any\\nexport const exported = () => $.export()'
const precompiler = new Precompiler(memoryHost({ ...configured, "/main.ts": source }), opts)
const statusesOf = ({ sites }) => sites.map(site => site.status)
console.log(JSON.stringify([
	statusesOf(precompiler.analyze(source, "/main.ts")),
	statusesOf(precompiler.precompile(source, "/main.ts"))
]))`)
			).snap([
				["accepted", "accepted"],
				["accepted", "accepted"]
			])
		}).timeout(60000)

		it("analyzes a module under the configuration its thread holds", () => {
			attest(
				printedInFreshThread(`import { Precompiler } from "@ark/precompile"
import { memoryHost } from "./utils.ts"

const configured = {
	"/config.ts": 'import { configure } from "arktype/config"\\nconfigure({ onUndeclaredKey: process.argv.length > 99 ? "delete" : "reject" })'
}
const opts = { config: "/config.ts" }
precompile("export const x = 1", configured, opts)
const precompiler = new Precompiler(memoryHost({ ...configured, "/main.ts": main }), opts)
const statusesOf = ({ sites }) => sites.map(site => site.status)
console.log(JSON.stringify([
	statusesOf(precompiler.analyze(main, "/main.ts")),
	statusesOf(precompiler.precompile(main, "/main.ts"))
]))`)
			).equals([["rejected"], ["rejected"]])
		}).timeout(60000)

		it("configure given anew with the values the build applied", () => {
			attest(
				printedInFreshThread(`import { Precompiler } from "@ark/precompile"
import { memoryHost } from "./utils.ts"

const config = 'import { configure } from "arktype/config"\\nimport type { Mode } from "./mode.ts"\\nconfigure({ onUndeclaredKey: "reject" as Mode })'
const files = { "/config.ts": config, "/mode.ts": 'export type Mode = "reject"', "/main.ts": main }
const precompiler = new Precompiler(memoryHost(files), { config: "/config.ts" })
const stampOf = source => precompiler.precompile(source, "/config.ts").code
precompiler.precompile(main, "/main.ts")
console.log(JSON.stringify([stampOf(config), stampOf('import { configure } from "arktype/config"\\nconfigure({onUndeclaredKey:"reject"})')]))`)
			).snap([
				'import { configure } from "arktype/config"\nimport type { Mode } from "./mode.ts"\nconfigure({ onUndeclaredKey: "reject" as Mode }, "29qk48_3h0snb")',
				'import { configure } from "arktype/config"\nconfigure({onUndeclaredKey:"reject"}, "29qk48_3h0snb")'
			])
		}).timeout(60000)

		it("configure given anew with other values than the build applied", () => {
			attest(
				printedInFreshThread(`import { Precompiler } from "@ark/precompile"
import { memoryHost } from "./utils.ts"

const config = 'import { configure } from "arktype/config"\\nconfigure({ onUndeclaredKey: "reject" })'
const precompiler = new Precompiler(memoryHost({ "/config.ts": config, "/main.ts": main }), { config: "/config.ts" })
const outcomes = [
	["/main.ts", main],
	["/config.ts", config.replace("reject", "delete")],
	["/main.ts", main]
].map(([id, source]) => precompiler.precompile(source, id).diagnostics.map(renderDiagnostic))
console.log(JSON.stringify(outcomes))`)
			).snap([
				[],
				[
					"/config.ts:2:1  configure() is given other values than arktype in this thread already applied\n  a module the configuration reads was given anew, as when a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
				],
				[
					"/main.ts:2:18  type({ a: \"string\" }) is created under a configuration the build can't apply\n  configure() is given other values than arktype in this thread already applied (/config.ts)\n  a module the configuration reads was given anew, as when a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
				]
			])
		}).timeout(60000)

		it("configure with an argument that creates a Type", () => {
			attest(
				printedInFreshThread(`const config = \`import { configure } from "arktype/config"
import { Email } from "./email.ts"

configure({ keywords: { "string.email": \\\`\\\${Email.expression}!\\\` } })\`
const { diagnostics } = precompile(
	config,
	{ "/email.ts": 'import { type } from "arktype"\\nexport const Email = type("string.email")' },
	{ config: "/main.ts" }
)
console.log(JSON.stringify(diagnostics.map(renderDiagnostic)))`)
			).snap([
				"/main.ts:4:1  configure() is called after its argument creates a Type\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
				"/main.ts:4:44  Email.expression is created under a configuration the build can't apply\n  configure() is called after its argument creates a Type (/main.ts)\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		}).timeout(60000)

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

		it("configure with an object an export reaches, whichever module the build is given first", () => {
			const files = {
				"/mode.ts":
					'const inner = { description: "one" }\nexport const table = { string: inner }\nexport const alias = inner',
				"/config.ts":
					'import { configure } from "arktype/config"\nimport { table } from "./mode.ts"\nconfigure({ keywords: { string: table.string } })',
				"/main.ts":
					'import { type } from "arktype"\nimport { alias } from "./mode.ts"\nexport const T = type("string").describe(alias.description)'
			}
			attest(
				[["/main.ts"], []].map(first =>
					printedInFreshThread(`import { Precompiler } from "@ark/precompile"
import { memoryHost } from "./utils.ts"
const files = ${JSON.stringify(files)}
const precompiler = new Precompiler(memoryHost(files), { config: "/config.ts" })
for (const path of ${JSON.stringify(first)}) precompiler.precompile(files[path], path)
const given = files["/config.ts"].replaceAll("\\n", ";\\n")
console.log(JSON.stringify(precompiler.precompile(given, "/config.ts").diagnostics.map(renderDiagnostic)))`)
				)
			).snap([
				[
					"/config.ts:3:1  configure({ keywords: { string: table.string } }) is not static\n  `table` is exported from /mode.ts, so another module can write what the configuration holds: declare it in the call instead"
				],
				[
					"/config.ts:3:1  configure({ keywords: { string: table.string } }) is not static\n  `table` is exported from /mode.ts, so another module can write what the configuration holds: declare it in the call instead"
				]
			])
		}).timeout(60000)

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

		it("configure in a declaration or default export at the config module's top level", () => {
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

		it("configure's value read by another module", () => {
			attest(
				printedInFreshThread(`import { Precompiler } from "@ark/precompile"
import { memoryHost } from "./utils.ts"

const files = {
	"/config.ts": 'import { configure } from "arktype/config"\\nexport const config = configure({ keywords: { string: { description: "one" } } })',
	"/main.ts": 'import { type } from "arktype"\\nimport { config } from "./config.ts"\\nexport const T = type("number").describe(config.keywords.string.description)'
}
const precompiler = new Precompiler(memoryHost(files), { config: "/config.ts" })
const { diagnostics } = precompiler.precompile(files["/main.ts"], "/main.ts")
const { sites } = precompiler.analyze(files["/main.ts"], "/main.ts")
console.log(JSON.stringify([diagnostics.map(renderDiagnostic), sites.map(site => site.value.description)]))`)
			).snap([[], ["one"]])
		}).timeout(60000)

		it("hints a refusal using a keyword configured to hold a function or symbol as any other", () => {
			attest(
				printedInFreshThread(`import { Precompiler } from "@ark/precompile"
import { memoryHost } from "./utils.ts"

const files = {
	"/config.ts": 'import { configure } from "arktype/config"\\nconfigure({ keywords: { string: { expected: () => "text" }, number: { custom: Symbol.for("x") } } } as any)',
	"/main.ts": 'import { type } from "arktype"\\nexport const T = type({ a: "string" }).describe(String(Math.random()))\\nexport const U = type({ a: "number" }).describe(String(Math.random()))\\nexport const V = type({ a: "string" })'
}
const { diagnostics } = new Precompiler(memoryHost(files), { config: "/config.ts" }).precompile(files["/main.ts"], "/main.ts")
console.log(JSON.stringify(diagnostics.map(diagnostic => diagnostic.hint)))`)
			).snap([
				'Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
				'Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
				'Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
		}).timeout(60000)

		it("leaves a configure() marked // @ark-runtime to the runtime, which configures islands too", () => {
			attest(
				printedInFreshThread(`const source = 'import { configure, type } from "arktype"\\n// @ark-runtime\\nconfigure({ onUndeclaredKey: "delete" })\\n// @ark-runtime\\nexport const T = type({ name: process.argv[2] })'
const { code, diagnostics } = precompile(source, {}, { config: "/main.ts" })
console.log(JSON.stringify([code, diagnostics.map(renderDiagnostic)]))`)
			).snap([
				'import "arktype/internal/island.js"\nimport * as $ark$island from "arktype/internal"\nimport { configure } from "arktype"\n// @ark-runtime\nconfigure({ onUndeclaredKey: "delete" }, "mlgm0u_asdk1h")\n// @ark-runtime\nexport const T = $ark$island.type({ name: process.argv[2] })',
				[]
			])
		}).timeout(60000)

		it("configure other than at the config module's top level", () => {
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
	const text = "a number"
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
	const text = "a number"
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

		it("a Type created while the config module loads", () => {
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
			attest(
				diagnosticsOf(
					`import { type } from "arktype"
export const suffix = "!"
export const Name = type("string")
export const makeName = () => type("string")`,
					{
						"/config.ts": `import { configure } from "arktype/config"
import { suffix } from "./main.ts"
configure({ keywords: { "string.email": \`an address\${suffix}\` } })`
					},
					{ config: "/config.ts" }
				)
			).snap([
				'/main.ts:3:21  type("string") is created while the config module loads, before configure() runs\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.'
			])
		})

		it("a Type created after the config module loads", () => {
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
			// Node's type stripping and `verbatimModuleSyntax` keep an import only a type reads, which runs its module
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
			// the program's entry decides whether this module or the config module it imports runs first
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

		it("configure with a build define", () => {
			const opts = {
				config: "/main.ts",
				define: { "process.env.LANG": "de" }
			}
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
configure({ domain: { description: () => process.env.LANG === "de" ? "eine Zahl" : "a number" } })`,
					{},
					opts
				)
			).snap([
				"/main.ts:2:1  configure({ domain: { description: () => process.env.LANG =… is not static\n  `process.env.LANG` (/main.ts:2:42) is a build define the configuration reads, and nothing compares its runtime value with the build's\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
import { describe } from /* writer */ "./locale.ts"
configure({ domain: { description: describe } })`,
					{
						"/locale.ts": `const german = process.env.LANG === "de"
export const describe = () => (german ? "eine Zahl" : "a number")`
					},
					opts
				)
			).snap([
				"/main.ts:3:1  configure({ domain: { description: describe } }) is not static\n  `process.env.LANG` (/locale.ts:1:16) is a build define the configuration reads, and nothing compares its runtime value with the build's\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
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
		it("arktype used outside a site", () => {
			attest(
				diagnosticsOf(`import { type, ArkErrors } from "arktype"
const make = type
const User = type({ name: "string" })
export const check = (data: unknown) => {
	const result = User(data)
	if (result instanceof type.errors || result instanceof ArkErrors) return result
	return User.assert(result)
}`)
			).snap([
				'/main.ts:2:14  `type` is used outside a precompiled site\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".'
			])
		})

		it("re-exports of arktype", () => {
			attest(
				diagnosticsOf(`import { type, scope } from "arktype"
export { type }
export default scope`)
			).snap([])
		})

		it("arktype namespace imports", () => {
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
		})

		it("modules that are not strict mode", () => {
			const diagnosticsAt = (id: string, source: string, runtime?: "arktype") =>
				precompileModule(source, id, memoryHost({ [id]: source }), {
					runtime
				}).diagnostics.map(renderDiagnostic)
			const body = `import { type } from "arktype"
export const T = type("string")`
			attest([
				diagnosticsAt("/main.cts", body),
				diagnosticsAt("/main.cts", `"use strict"\n${body}`),
				diagnosticsAt("/main.cts", body, "arktype"),
				diagnosticsAt("/main.ts", body),
				diagnosticsAt("/main.cjs", `module.exports = {}`)
			]).snap([
				[
					'/main.cts:1:1  /main.cts is not strict mode code\n  the standalone runtime freezes arktype values, and outside strict mode a write to a frozen value is ignored rather than throwing\n  Add "use strict" at the top of the module, or make it an ES module.'
				],
				[],
				[],
				[],
				[]
			])
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

		it("cache mode holds no value the build cannot read", () => {
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
		})

		it("cache mode reports without rejecting", () => {
			const source = `import { type } from "arktype"
const make = type
export const field = (limit: number) => {
	const Field = type(\`string <= \${limit}\`)
	return Field
}`
			attest(
				analyze(source).diagnostics.map(d => `${d.rule} ${d.severity}`)
			).snap(["R4 error", "R1 error"])
			attest(diagnosticsOf(source, {}, { runtime: "arktype" })).snap([
				'/main.ts:4:16  type(`string <= ${limit}`) cannot be precompiled\n  `limit` is a parameter of field (/main.ts:3:23); its value is known only at runtime\n  With runtime: "arktype", arktype defines this at runtime.'
			])
			// arktype tests `null` against `Cat` while defining the type, which a standalone factory can't
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
