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
				"/main.ts:4:1  configure() is called after its argument creates a Type\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		}).timeout(60000)

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
configure({ number: { description: describe } })`,
					{},
					{ config: "/main.ts" }
				)
			).snap([
				"/main.ts:6:1  configure({ number: { description: describe } }) is not static\n  the description writer at /main.ts:2:18 must be a static helper, since arktype calls it while defining types\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
		})

		it("configure with a build define", () => {
			const opts = {
				config: "/main.ts",
				define: { "process.env.MODE": "strict" }
			}
			const files = {
				"/mode.ts": 'export const strict = process.env.MODE === "strict"'
			}
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
configure({ onUndeclaredKey: process.env.MODE === "strict" ? "reject" : "ignore" })`,
					{},
					opts
				)
			).snap([
				"/main.ts:2:1  configure({ onUndeclaredKey: process.env.MODE === \"strict\" … is not static\n  `process.env.MODE` is a build define, and nothing compares its runtime value with the build's\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
			])
			attest(
				diagnosticsOf(
					`import { configure } from "arktype/config"
import { strict } from "./mode.ts"
configure({ onUndeclaredKey: strict ? "reject" : "ignore" })`,
					files,
					opts
				)
			).snap([
				'/main.ts:3:1  configure({ onUndeclaredKey: strict ? "reject" : "ignore" }) is not static\n  `process.env.MODE` is a build define, and nothing compares its runtime value with the build\'s\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.'
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
		})
	})
})
