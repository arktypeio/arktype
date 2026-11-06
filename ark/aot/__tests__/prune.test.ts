import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { Precompiler, type PrecompileOptions } from "@ark/aot"
import { linkBundle } from "@ark/aot/internal/link.ts"
import { emitPrecompiled } from "@ark/aot/internal/emit.ts"
import {
	addLoaded,
	programAsBuilt,
	scanProgram,
	unseenProblemOf,
	writeKeptMembersMessage,
	writeUnseenMessage,
	type BuiltImport,
	type BuiltModule,
	type LoadedSources
} from "@ark/aot/internal/scan.ts"
import { writeUnbuiltReadMessage } from "@ark/aot/internal/messages.ts"
import {
	pruneBeforePluginMessage,
	writePruneHostMessage
} from "@ark/aot/internal/settings.ts"
import { precompile as bunPlugin } from "@ark/aot/bun"
import { register } from "@ark/aot/node"
import turbopack from "@ark/aot/turbopack"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { rspack } from "@rspack/core"
import {
	build,
	context,
	type BuildFailure,
	type BuildOptions,
	type Plugin
} from "esbuild"
import {
	build as viteBuild,
	defaultClientConditions,
	type InlineConfig,
	type Plugin as VitePlugin,
	type Rolldown
} from "vite"
import webpack, { type Stats } from "webpack"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { join, posix, relative, win32 } from "node:path"
import { stripVTControlCharacters } from "node:util"
import {
	memoryHost,
	normalized,
	run,
	runBundle,
	runCli,
	runPlain,
	writeFixture
} from "./utils.ts"

const types = `import { type } from "arktype"

export const User = type({ name: "string" })
`

// a barrel re-exporting what arktype/runtime lacks, which only sites read, or,
// renamed, nothing
const arkBarrel = (extension: string) => ({
	[`ark${extension}`]: `export { match as ark_match, scope, type } from "arktype"\n`,
	[`main${extension}`]: `import { ark_match, scope, type } from "./ark${extension}"

const types = scope({ user: { name: "string" } }).export()
const Id = type("string")

console.log(String(types.user({ name: 5 })), Id("x"))
`
})

// errors "none" fails through one module named for what it does, whose issue
// is found once read only where the program calls a validator
const callingFrom = (types: string) =>
	`import { User } from "${types}"\n\nconsole.log(String(User({ name: 5 })))\n`

const assertingFrom = (types: string) =>
	`import { User } from "${types}"\n\ntry {\n\tUser.assert({ name: 5 })\n} catch (e) {\n\tconsole.log(e.message)\n}\n`

// what a production build for size reads of a program from /main.ts, or the
// errors failing its build
const usageFrom = async (
	files: Record<string, string>,
	opts?: PrecompileOptions
) => {
	const precompiler = new Precompiler(memoryHost(files), {
		preset: "smallest",
		cwd: "/",
		...opts
	})
	const scanned = await scanProgram("test", [{ id: "/main.ts" }], {
		resolve: async (specifier, importer) => {
			// a package installed in /node_modules, or one left external
			if (!specifier.startsWith(".")) {
				const id = `/node_modules/${specifier}/index.js`
				return id in files ? id : null
			}
			const id = posix.join(posix.dirname(importer), specifier)
			return id in files ? id : undefined
		},
		readFile: id => files[id],
		isTransformed: id => !id.startsWith("/node_modules/"),
		idOf: id => id,
		cwd: "/"
	})
	if (typeof scanned === "string") return scanned
	// a module that fails its build would hide what the scan read
	for (const id in scanned.modules) {
		const errors = precompiler
			.precompile(files[id], id)
			.diagnostics.filter(diagnostic => diagnostic.severity === "error")
		if (errors.length) return errors.map(error => error.message)
	}
	return precompiler.scan(scanned)
}

// the members a production build for size leaves out of the program's
// validators, why it leaves none where it can't, or the errors failing its
// build
const droppedFrom = async (
	files: Record<string, string>,
	opts?: PrecompileOptions
) => {
	const usage = await usageFrom(files, opts)
	if (typeof usage === "string" || Array.isArray(usage)) return usage
	if (!usage.unpruned) return usage.dropped
	// the reason alone, where it keeps every member
	const [before, after] = writeKeptMembersMessage("\0", everyMember).split("\0")
	return usage.unpruned.startsWith(before) && usage.unpruned.endsWith(after) ?
			usage.unpruned.slice(before.length, -after.length)
		:	usage.unpruned
}

// main.ts reading types.ts's User as `read` does
const droppedReading = (read: string, files: Record<string, string> = {}) =>
	droppedFrom({
		"/types.ts": types,
		"/main.ts": `import { User } from "./types.ts"\n\n${read}\n`,
		...files
	})

const everyMember = ["assert", "meta", "~standard", "methods"]

// a lazy build passes the factory creating Admin the User it read
const composed = {
	"/types.ts": types,
	"/admin.ts": `import { type } from "arktype"\nimport { User } from "./types.ts"\n\nexport const Admin = type({ user: User })`,
	"/main.ts": `import { Admin } from "./admin.ts"\n\nAdmin({})`
}

contextualize(function (this: Mocha.Suite) {
	// each bundle starts a precompiler of its own, which a loaded machine slows
	this.timeout(60_000)

	describe("reads it recognizes", () => {
		it("a call", async () => {
			attest(await droppedReading("User({})")).equals(everyMember)
		})

		it(".allows", async () => {
			attest(await droppedReading("User.allows({})")).equals(everyMember)
		})

		it("through a const choosing between validators", async () => {
			const admin = {
				"/admin.ts": `import { type } from "arktype"\n\nexport const Admin = type({ name: "string", role: "'admin'" })`
			}
			attest(
				await droppedReading(
					`import { Admin } from "./admin.ts"\nconst T = import.meta.env.DEV ? Admin : User\n\nT.assert({})`,
					admin
				)
			).snap(["meta", "~standard", "methods"])
			attest(
				await droppedReading(
					`import { Admin } from "./admin.ts"\nconst T = (import.meta.env.DEV && Admin) || User\n\nT({})`,
					admin
				)
			).equals(everyMember)
			attest(
				await droppedReading(
					`import { Admin } from "./admin.ts"\nconst T = import.meta.env.DEV ? Admin : User\n\nconsole.log(T)`,
					admin
				)
			).equals(everyMember)
		})

		it("what a dependency it's passed to reads", async () => {
			// as @hono/standard-validator, validating through ~standard
			const validator = {
				"/node_modules/validator/index.js": `export const sValidator = (target, schema) => async value => (await schema["~standard"].validate(value)).issues`
			}
			attest(
				await droppedReading(
					`import { sValidator } from "validator"\n\nsValidator("json", User)`,
					validator
				)
			).snap(["assert", "meta", "methods"])
			// Trimmed only passed to the factory creating Admin, which finds its
			// functions by it, reading no member
			attest(
				await droppedFrom({
					...validator,
					"/main.ts": `import { type } from "arktype"\nimport { sValidator } from "validator"\n\nconst Trimmed = type("string").pipe(s => s.trim())\nconst Admin = type({ name: Trimmed })\n\nsValidator("json", Admin)`
				})
			).snap(["assert", "meta", "methods"])
			// as the MCP SDK, storing it at a key it reads later
			const server = {
				"/node_modules/server/index.js": `export class McpServer {
	tools = {}
	registerTool(name, config, handler) {
		this.tools[name] = { config, handler }
	}
	call(name, args) {
		const { config } = this.tools[name]
		return "~standard" in config.inputSchema ? config.inputSchema["~standard"].validate(args) : config.inputSchema.assert(args)
	}
}`
			}
			attest(
				await droppedReading(
					`import { McpServer } from "server"\n\nnew McpServer().registerTool("t", { inputSchema: User }, () => {})`,
					server
				)
			).snap(["meta", "methods"])
		})

		describe("what a production factory reads of what it's passed", () => {
			const production = { preset: undefined, creationChecks: "none" } as const
			const even = `import { type } from "arktype"

export const Even = type("number").narrow(n => n % 2 === 0)
export const Named = type({ name: "string" })
export const Fields = { even: Even, name: type("string") }
`

			const droppedFromMain = (main: string) =>
				droppedFrom(
					{
						"/types.ts": even,
						"/main.ts": `import { type } from "arktype"\n${main}\n`
					},
					production
				)

			it("a Type's holes off the object holding it", async () => {
				attest(
					await droppedFromMain(
						`import { Fields } from "./types.ts"\n\nconst T = type({ even: Fields.even, name: Fields.name })\nT({})`
					)
				).equals(everyMember)
			})

			it("nothing of an input past a parameter it reads", async () => {
				attest(
					await droppedFromMain(
						`import { Named } from "./types.ts"\n\nconst T = type({ named: Named }).narrow(o => !!o)\nT({})`
					)
				).equals(everyMember)
			})

			it("a member a site's value depends on", async () => {
				attest(
					await droppedFrom(
						{
							"/types.ts": `import { type } from "arktype"\n\nexport const Tagged = type("string").configure({ tag: "a" })\n`,
							"/main.ts": `import { type } from "arktype"\nimport { Tagged } from "./types.ts"\n\nconst T = type.enumerated(Tagged.meta.tag)\nT("a")\n`
						},
						production
					)
				).snap(
					"main.ts:2:10 passes Tagged to a factory that checks it, which may read any member"
				)
			})

			it("a Type through a member of another", async () => {
				attest(
					await droppedFrom(
						{
							"/types.ts": `import { type } from "arktype"\n\nconst Named = type({ name: "string" })\nexport const Holding = type("string").configure({ schema: Named })\n`,
							"/main.ts": `import { type } from "arktype"\nimport { Holding } from "./types.ts"\n\nconst H = { held: Holding }\nconst T = type({ a: H.held.meta.schema })\nT({})\n`
						},
						production
					)
				).snap(
					"main.ts:4:7 passes H to a factory that checks it, which may read any member"
				)
			})
		})

		it("each member a dependency may read", async () => {
			attest(
				await droppedReading(`import { check } from "checker"\n\ncheck(User)`, {
					"/node_modules/checker/index.js": `export const check = t => [t.meta, String(t)]`
				})
			).snap(["assert", "~standard"])
			// which keys it has depends on each, so listing them loses track
			attest(
				await droppedReading(`import { check } from "checker"\n\ncheck(User)`, {
					"/node_modules/checker/index.js": `export const check = t => Object.keys(t)`
				})
			).snap(
				"the validator at types.ts:3:21 is lost where node_modules/checker/index.js:1:27 lists its keys"
			)
			attest(
				await droppedReading(`import { check } from "checker"\n\ncheck(User)`, {
					"/node_modules/checker/index.js": `export const check = (t, k) => k in t`
				})
			).snap(
				"the validator at types.ts:3:21 is lost where node_modules/checker/index.js:1:37 tests it for a key the build can't name"
			)
			// as the MCP SDK's bundled ajv reading `fs[f]`, a dependency's read at a
			// key it doesn't name may find what holds it, so passing that on keeps
			// each member, as losing track there does, without a warning
			attest(
				await droppedReading(
					`import { Store } from "store"\n\nconst store = new Store()\nstore.keep("a", { v: User })\nstore.show(console.log)`,
					{
						"/node_modules/store/index.js": `export class Store {
	held = {}
	keep(name, holder) {
		this.held[name] = holder
	}
	show(cb, key) {
		cb({ entry: this.held[key] })
	}
}`
					}
				)
			).equals([])
		})

		it(".assert", async () => {
			attest(await droppedReading("User.assert({})")).snap([
				"meta",
				"~standard",
				"methods"
			])
		})

		it("~standard", async () => {
			attest(await droppedReading(`User["~standard"].validate({})`)).snap([
				"assert",
				"meta",
				"methods"
			])
		})

		it(".meta", async () => {
			attest(await droppedReading("console.log(User.meta)")).snap([
				"assert",
				"~standard",
				"methods"
			])
		})

		it("traverse()", async () => {
			attest(await droppedReading("User.traverse({})")).snap([
				"assert",
				"meta",
				"~standard"
			])
		})

		it("from(), which calls assert", async () => {
			attest(await droppedReading("User.from({})")).snap(["meta", "~standard"])
		})

		it("toString()", async () => {
			attest(
				await droppedFrom(
					{
						"/types.ts": types,
						"/main.ts": `import { User } from "./types.ts"\n\nUser.toString()`
					},
					{ members: { expression: true } }
				)
			).snap(["assert", "meta", "~standard"])
		})

		it("nothing in an introspection member the build bakes", async () => {
			attest(await droppedReading("console.log(User.expression)")).equals(
				everyMember
			)
		})

		it("joins what each module reads", async () => {
			attest(
				await droppedReading(`import "./other.ts"\nUser.assert({})`, {
					"/other.ts": `import { User } from "./types.ts"\n\nUser.meta`
				})
			).snap(["~standard", "methods"])
		})

		it("through a renamed re-export", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/barrel.ts": `export { User as Account } from "./types.ts"`,
					"/main.ts": `import { Account } from "./barrel.ts"\n\nAccount.assert({})`
				})
			).snap(["meta", "~standard", "methods"])
		})

		it("through export *", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/barrel.ts": `export * from "./types.ts"`,
					"/main.ts": `import { User } from "./barrel.ts"\n\nUser({})`
				})
			).equals(everyMember)
		})

		it("off a namespace", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/main.ts": `import * as t from "./types.ts"\n\nt.User.assert({})`
				})
			).snap(["meta", "~standard", "methods"])
		})

		it("through a default export", async () => {
			attest(
				await droppedFrom({
					"/types.ts": `import { type } from "arktype"\n\nconst User = type({ name: "string" })\n\nexport default User`,
					"/main.ts": `import User from "./types.ts"\n\nUser({})`
				})
			).equals(everyMember)
		})

		it("through a default export of a binding", async () => {
			attest(
				await droppedFrom({
					"/types.ts": `import { type } from "arktype"\n\nconst User = type({ name: "string" })\n\nexport default User`,
					"/main.ts": `import User from "./types.ts"\n\nUser.assert({})`
				})
			).equals(["meta", "~standard", "methods"])
		})

		it("an entry's own validator, which it doesn't export", async () => {
			attest(
				await droppedFrom({
					"/main.ts": `import { type } from "arktype"\n\nconst User = type({ name: "string" })\n\nUser.assert({})`
				})
			).snap(["meta", "~standard", "methods"])
		})

		it("nothing in a definition the build precompiles", async () => {
			attest(
				await droppedFrom({
					"/types.ts": `${types}\nexport const Admin = type({ user: User })`,
					"/main.ts": `import { Admin } from "./types.ts"\n\nAdmin({})`
				})
			).equals(everyMember)
		})

		it("nothing in an import a factory is passed but doesn't check", async () => {
			attest(
				await droppedFrom(composed, {
					preset: undefined,
					creationChecks: "none"
				})
			).equals(everyMember)
		})

		it("nothing in a validator a factory finds its functions by", async () => {
			attest(
				await droppedFrom(
					{
						"/types.ts": `import { type } from "arktype"\n\nexport const Trimmed = type("string").pipe(s => s.trim())`,
						"/admin.ts": `import { type } from "arktype"\nimport { Trimmed } from "./types.ts"\n\nexport const Admin = type({ name: Trimmed })`,
						"/main.ts": `import { Admin } from "./admin.ts"\n\nAdmin({})`
					},
					{ preset: undefined, creationChecks: "none" }
				)
			).equals(everyMember)
			attest(
				await droppedFrom({
					"/main.ts": `import { type } from "arktype"\n\nconst Trimmed = type("string").pipe(s => s.trim())\nconst Admin = type({ name: Trimmed, "alias?": Trimmed.or("undefined") })\n\nAdmin({})`
				})
			).equals(everyMember)
		})

		it("nothing in a type-only import", async () => {
			attest(
				await droppedReading(
					`import type { User as T } from "./types.ts"\nexport const f = (u: T) => User({})`
				)
			).equals(everyMember)
		})

		it("keeps a member the options set", async () => {
			attest(
				await droppedFrom(
					{
						"/types.ts": types,
						"/main.ts": `import { User } from "./types.ts"\n\nUser({})`
					},
					{ members: { assert: true } }
				)
			).snap(["meta", "~standard", "methods"])
		})

		it("a function a definition keeps", async () => {
			attest(
				await droppedFrom({
					"/types.ts": `${types}\nexport const Named = type("string").narrow(s => User.allows({ name: s }))`,
					"/main.ts": `import { Named } from "./types.ts"\n\nNamed({})`
				})
			).equals(everyMember)
		})
	})

	describe("reads that keep every member", () => {
		it("an entry's export", async () => {
			attest(await droppedReading(`export { User }`)).snap(
				"main.ts exports User, which code outside the bundle may read"
			)
		})

		it("an argument to a function the build can't follow", async () => {
			attest(
				await droppedReading(
					`declare const send: (t: unknown) => void\nsend(User)`
				)
			).snap(
				"the validator at types.ts:3:21 is lost where main.ts:4:6 passes it to send, which the build can't follow"
			)
		})

		it("a property", async () => {
			attest(await droppedReading(`export const types = { User }`)).snap(
				"main.ts exports types, which code outside the bundle may read"
			)
		})

		it("a namespace read whole", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/main.ts": `import * as t from "./types.ts"\n\nconsole.log(t)`
				})
			).snap("main.ts:3:13 reads the namespace t, which holds User, whole")
		})

		it("export * as", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/barrel.ts": `export * as t from "./types.ts"`,
					"/main.ts": `import { t } from "./barrel.ts"\n\nt.User({})`
				})
			).snap(
				"barrel.ts:1:1 re-exports types.ts as a namespace, which may read its User any way"
			)
		})

		it("a dynamic import", async () => {
			attest(await droppedReading(`await import("./types.ts")`)).snap(
				"main.ts:3:7 loads types.ts by import(), which may read its User any way"
			)
		})

		it("require", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/main.ts": `const { User } = require("./types.ts")\n\nUser({})`
				})
			).snap(
				"main.ts:1:18 loads types.ts by require(), which may read its User any way"
			)
		})

		it("eval", async () => {
			attest(await droppedReading(`User({})\neval("User.assert({})")`)).snap(
				"main.ts:4:1 calls eval, which may read any binding"
			)
		})

		it("a validator created outside a const", async () => {
			attest(
				await droppedFrom({
					"/main.ts": `import { type } from "arktype"\n\ndeclare const send: (t: unknown) => void\nsend(type({ name: "string" }))`
				})
			).snap(
				"the validator at main.ts:4:6 is lost where main.ts:4:6 passes it to send, which the build can't follow"
			)
		})

		it("an import a factory checks", async () => {
			attest(
				await droppedFrom(composed, {
					preset: undefined,
					creationChecks: "types"
				})
			).snap(
				"admin.ts:2:10 passes User to a factory that checks it, which may read any member"
			)
		})

		it("still reads what the program reads whole of a validator a factory reads", async () => {
			const usage = await usageFrom(
				{
					"/types.ts": `import { type } from "arktype"\n\nexport const Tagged = type("string").configure({ tag: "a" })\nexport const Other = type({ other: "string" })\n`,
					"/main.ts": `import { type } from "arktype"\nimport { Tagged, Other } from "./types.ts"\n\nconst T = type.enumerated(Tagged.meta.tag)\nT("a")\nOther({})\n`
				},
				{ preset: undefined, creationChecks: "none" }
			)
			if (typeof usage === "string" || Array.isArray(usage))
				throw new Error(String(usage))
			attest(usage.written).equals(true)
			attest(usage.dropped).equals([])
			attest(usage.baked).snap([
				"main.ts:4:11 bakes nothing (dataflow)",
				"types.ts:3:23 bakes nothing (dataflow)",
				"types.ts:4:22 bakes nothing (dataflow)"
			])
		})

		it("a Scope", async () => {
			attest(
				await droppedFrom({
					"/main.ts": `import { scope } from "arktype"\n\nconst $ = scope({ user: { name: "string" } }).export()\n\n$.user({})`
				})
			).snap(
				"main.ts creates a Scope, Module or Generic, whose validators it can't follow"
			)
		})

		it("JSX", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/main.ts": `import "./view.tsx"`,
					"/view.tsx": `import { User } from "./types.ts"\n\nexport const view = <User />`
				})
			).snap(
				"the validator at types.ts:3:21 is lost where view.tsx:3:22 reads it in <User />, which the build can't follow"
			)
		})
	})

	describe("what issues may hold", () => {
		const issuesOf = async (main: string) => {
			const usage = await usageFrom({ "/main.ts": main })
			return typeof usage === "string" || Array.isArray(usage) ?
					usage
				:	usage.issues
		}

		it("of a program read whole, like one an entry exports", async () => {
			attest(
				await issuesOf(
					`import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n`
				)
			).snap({
				bracketsKeys: false,
				reportsIndices: false,
				writesText: false,
				listsUnions: false,
				rewritesUnions: true,
				traversesUnions: false,
				readsKeySites: true,
				runsArktype: false,
				appliesValues: false,
				transformsBranches: false,
				failsInBranches: false,
				discriminatesBooleans: false,
				readsSummary: true,
				readsErrors: true
			})
			attest(
				await issuesOf(
					`import { type } from "arktype"\n\nexport const Tagged = type({ tags: "string[]" })\n`
				)
			).snap({
				bracketsKeys: false,
				reportsIndices: true,
				writesText: false,
				listsUnions: false,
				rewritesUnions: true,
				traversesUnions: false,
				readsKeySites: false,
				runsArktype: false,
				appliesValues: false,
				transformsBranches: false,
				failsInBranches: false,
				discriminatesBooleans: false,
				readsSummary: true,
				readsErrors: true
			})
		})

		it("a union's issue on a Traversal, a callback's", async () => {
			attest(
				await issuesOf(
					`import { type } from "arktype"\n\nconst Keep = () => true\n\nexport const Either = type({ a: "string" }).or({ b: "number" }).narrow(Keep).pipe(data => data)\n`
				)
			).snap({
				bracketsKeys: true,
				reportsIndices: true,
				writesText: true,
				listsUnions: true,
				rewritesUnions: true,
				traversesUnions: true,
				readsKeySites: true,
				runsArktype: false,
				appliesValues: false,
				transformsBranches: false,
				failsInBranches: false,
				discriminatesBooleans: false,
				readsSummary: true,
				readsErrors: true
			})
		})

		describe("of what checkers hold", () => {
			// enough that checkers repay the runtime they read
			const repaying = Array.from(
				{ length: 30 },
				(_, i) =>
					`export const F${i} = type({ a${i}: "string > ${i}", b${i}: "number > ${i}" })`
			).join("\n")

			const heldBy = async (definition: string) => {
				const issues = await issuesOf(
					`import { type } from "arktype"\n\nexport const T = ${definition}\n${repaying}\n`
				)
				return typeof issues === "object" && !Array.isArray(issues) ?
						Object.entries(issues)
							.filter(
								([k, on]) =>
									on &&
									[
										"appliesValues",
										"transformsBranches",
										"failsInBranches",
										"discriminatesBooleans"
									].includes(k)
							)
							.map(([k]) => k)
					:	issues
			}

			it("nothing of a morph where none's held", async () => {
				attest(await heldBy(`type({ a: "string" })`)).equals([])
			})

			it("a value applied by what holds it", async () => {
				attest(
					await heldBy(`type({ a: type("string").pipe(s => s.trim()) })`)
				).equals(["appliesValues"])
			})

			it("a union whose branch writes only literals can't fail", async () => {
				attest(
					await heldBy(`type({ k: "'a'", b: "string = 'x'" }).or({ k: "'c'" })`)
				).equals(["transformsBranches"])
			})

			it("a union whose branch holds a morph can", async () => {
				attest(
					await heldBy(
						`type({ k: "'a'", b: type("string").pipe(s => s.trim()) }).or({ k: "'c'" })`
					)
				).equals(["appliesValues", "transformsBranches", "failsInBranches"])
			})

			it("a union told apart by a boolean", async () => {
				attest(
					await heldBy(
						`type({ ok: "true", a: "string" }).or({ ok: "false", b: "number" })`
					)
				).equals(["discriminatesBooleans"])
			})
		})

		it("brackets the undeclared keys a structure rejects, which come from data", async () => {
			attest(
				await issuesOf(
					`import { type } from "arktype"\n\nexport const Strict = type({ name: "string" }).onUndeclaredKey("reject")\n`
				)
			).snap({
				bracketsKeys: true,
				reportsIndices: false,
				writesText: false,
				listsUnions: false,
				rewritesUnions: true,
				traversesUnions: false,
				readsKeySites: true,
				runsArktype: false,
				appliesValues: false,
				transformsBranches: false,
				failsInBranches: false,
				discriminatesBooleans: false,
				readsSummary: true,
				readsErrors: true
			})
		})
	})

	describe("what a program reads of its errors", () => {
		const readOf = async (body: string, imports = `{ type }`) => {
			const usage = await usageFrom({
				"/main.ts": `import ${imports} from "arktype"\n\nconst T = type({ name: "string" })\n\n${body}\n`
			})
			if (typeof usage === "string" || Array.isArray(usage))
				throw new Error(`${usage}`)
			return [usage.issues!.readsSummary, usage.issues!.readsErrors]
		}
		const neither = [false, false]
		const whole = [true, true]

		it("past a test for them, nothing of them", async () => {
			attest(
				await readOf(
					`const out = T({})\nconsole.log(out instanceof type.errors ? out.issues : out)`
				)
			).equals(neither)
			attest(
				await readOf(
					`const out = T({})\nif (!(out instanceof type.errors)) console.log(out)`
				)
			).equals(neither)
			attest(
				await readOf(
					`const out = T({})\nconst check = () => {\n\tif (out instanceof type.errors) return out.count\n\treturn out\n}\nconsole.log(check)`
				)
			).equals(neither)
			attest(
				await readOf(
					`import { ArkErrors } from "arktype"\nconst out = T({})\nif (out instanceof ArkErrors) throw out.issues\nconsole.log(out)`
				)
			).equals(neither)
		})

		it("its summary apart from the rest", async () => {
			attest(
				await readOf(
					`const out = T({})\nconsole.log(out instanceof type.errors ? out.summary : out)`
				)
			).equals([true, false])
		})

		it("before a test or without one, as they may be there", async () => {
			attest(await readOf(`console.log(T({}))`)).equals(whole)
			attest(await readOf(`const out = T({})\nconsole.log(out)`)).equals(whole)
			attest(
				await readOf(
					`const out = T({})\nconsole.log(out)\nif (out instanceof type.errors) throw out.issues`
				)
			).equals(whole)
			// no statement after the test is past it
			attest(
				await readOf(
					`const out = T({})\nif (out instanceof type.errors) console.log(out.issues)\nconsole.log(out)`
				)
			).equals(whole)
		})

		it("by a test for something else, or a read of another member", async () => {
			attest(
				await readOf(
					`const out = T({})\nconsole.log(out instanceof Error ? out : 1)`
				)
			).equals(whole)
			attest(
				await readOf(
					`const out = T({})\nif (out instanceof type.errors) out.throw()`
				)
			).equals(whole)
		})

		it("in a hoisted function, which may run before the test", async () => {
			attest(
				await readOf(
					`const out = T({})\nrun()\nif (out instanceof type.errors) throw out.issues\nfunction run() {\n\tconsole.log(out)\n}`
				)
			).equals(whole)
		})

		it("where the class itself is read", async () => {
			attest(await readOf(`console.log(type.errors)\nT({})`)).equals(whole)
			attest(await readOf(`T.assert({})`)).equals(whole)
		})

		it("through a module re-exporting arktype's, as it's read there", async () => {
			const readThrough = async (barrel: string, body: string) => {
				const usage = await usageFrom({
					"/ark.ts": barrel,
					"/main.ts": `import { type } from "arktype"\nimport { arkType } from "./ark.ts"\n\nconst T = type({ name: "string" })\n\n${body}\n`
				})
				if (typeof usage === "string" || Array.isArray(usage))
					throw new Error(`${usage}`)
				return [usage.issues!.readsSummary, usage.issues!.readsErrors]
			}
			const printed = `console.log(String(new arkType.errors()))\nT({})`
			attest(
				await readThrough(
					`export { type as arkType } from "arktype"\n`,
					printed
				)
			).equals(whole)
			attest(await readThrough(`export * from "arktype"\n`, printed)).equals(
				whole
			)
			attest(
				await readThrough(
					`export { type as arkType } from "arktype"\n`,
					`const out = T({})\nconsole.log(out instanceof arkType.errors ? out.issues : out)`
				)
			).equals(neither)
			attest(
				await readThrough(
					`export * as arkType from "arktype"\n`,
					`console.log(String(new arkType.ArkErrors()))\nT({})`
				)
			).equals(whole)
		})
	})

	describe("held in an object literal", () => {
		const schemas = `import { type } from "arktype"

export const schemas = { user: type({ name: "string" }), post: type({ title: "string" }) }
`

		it("read at its key", async () => {
			attest(
				await droppedFrom({
					"/types.ts": schemas,
					"/main.ts": `import { schemas } from "./types.ts"\n\nschemas.user({})\nschemas.post.allows({})\n`
				})
			).equals(everyMember)
			attest(
				await droppedFrom({
					"/types.ts": schemas,
					"/main.ts": `import { schemas } from "./types.ts"\n\nschemas.user.assert({})\n`
				})
			).snap(["meta", "~standard", "methods"])
		})

		it("read at a computed key, which may be any held", async () => {
			attest(
				await droppedFrom({
					"/types.ts": schemas,
					"/main.ts": `import { schemas } from "./types.ts"\n\nconst k = process.argv[2] as "user" | "post"\nschemas[k].assert({})\n`
				})
			).snap(["meta", "~standard", "methods"])
		})

		it("held by a const the module reads", async () => {
			attest(
				await droppedReading(
					"const all = { user: User } as const\nconsole.log(all.user({}))"
				)
			).equals(everyMember)
		})

		it("nested", async () => {
			attest(
				await droppedReading(
					"const api = { v1: { user: User } }\napi.v1.user.allows({})\napi.v1.other?.assert({})"
				)
			).snap(["assert", "meta", "~standard", "methods"])
		})

		it("but not where the object is read whole", async () => {
			attest(
				await droppedReading(
					"declare const send: (t: unknown) => void\nconst all = { user: User }\nsend(Object.values(all))"
				)
			).snap(
				"the validator at types.ts:3:21 is lost where main.ts:5:6 stores it at a key the build can't name"
			)
		})

		it("and where its key is computed", async () => {
			attest(
				await droppedReading(
					'const k = "user"\nconst all = { [k]: User }\nall.user({})'
				)
			).equals(everyMember)
		})
	})

	describe("programs it can't read", () => {
		it("a specifier it can't resolve", async () => {
			attest(await droppedReading(`import "./unresolved.ts"\nUser({})`)).snap(
				'main.ts:3:1 imports "./unresolved.ts", which doesn\'t resolve to a file'
			)
		})

		it("a module of another language", async () => {
			attest(
				await droppedReading(`import "./view.vue"\nUser({})`, {
					"/view.vue": "<script setup>User.assert({})</script>"
				})
			).snap("main.ts:3:1 imports view.vue, which isn't a script it can read")
		})

		it("a computed dynamic import", async () => {
			attest(
				await droppedReading(`const path = "./types.ts"\nawait import(path)`)
			).snap("main.ts:4:7 imports a module by a computed specifier")
		})

		it("but a specifier holding a dollar sign, like a TanStack Router splat route's", async () => {
			attest(
				await droppedReading('await import("./$.ts")\nUser({})', {
					"/$.ts": "export const splat = true"
				})
			).equals(everyMember)
		})

		it("a computed require", async () => {
			attest(
				await droppedReading(`const path = "./types.ts"\nrequire(path)`)
			).snap("main.ts:4:1 calls require() by a computed specifier")
		})

		it("but a member named require", async () => {
			attest(
				await droppedReading(
					`interface Auth { require(): boolean }\nconst auth: Auth = { require: () => true }\nconst make = () => {\n\tfunction require() { return true }\n\treturn { require }\n}\nauth.require()\nmake()\nUser({})`
				)
			).equals(everyMember)
		})

		it("require read as a value", async () => {
			attest(await droppedReading(`const load = require`)).snap(
				"main.ts:3:14 reads require other than to call it"
			)
		})

		it("import.meta.glob", async () => {
			attest(await droppedReading(`import.meta.glob("./*.ts")\nUser({})`)).snap(
				"main.ts:3:1 reads import.meta.glob, which may load modules it can't name"
			)
		})

		it("but import.meta.env", async () => {
			attest(await droppedReading(`if (import.meta.env.PROD) User({})`)).equals(
				everyMember
			)
		})

		it("but import.meta.hot, which a bundle reads as undefined", async () => {
			attest(
				await droppedReading(
					`if (import.meta.hot) import.meta.hot.accept()\nUser({})`
				)
			).equals(everyMember)
		})

		it("but import.meta.webpackHot, or a flag Nuxt defines", async () => {
			attest(
				await droppedReading(
					`if (import.meta.webpackHot) import.meta.webpackHot.accept()\nif (import.meta.client && !import.meta.dev) User({})`
				)
			).equals(everyMember)
		})

		it("but a URL import.meta locates", async () => {
			attest(
				await droppedReading(
					`new URL("./logo.svg", import.meta.url)\nimport.meta.resolve("./types.ts")\nimport.meta.dirname\nUser({})`
				)
			).equals(everyMember)
		})

		it("but a module Vite loads as a string or a worker", async () => {
			attest(
				await droppedReading(
					`import source from "./types.ts?raw"\nimport logo from "./logo.svg?url"\nimport Reader from "./reader.ts?worker&inline"\nUser({})`,
					{
						"/types.ts?raw": "",
						"/logo.svg?url": "",
						"/reader.ts?worker&inline": ""
					}
				)
			).equals(everyMember)
		})
	})

	describe("dependencies", () => {
		// main.ts importing fw, a package whose index.js holds `fw`
		const droppedThrough = (fw: string, files: Record<string, string> = {}) =>
			droppedFrom({
				"/types.ts": types,
				"/main.ts": `import "fw"\n`,
				"/node_modules/fw/index.js": fw,
				...files
			})

		it("reads the program a dependency imports, as Nuxt's runtime imports its pages, past what it loads unnamed", async () => {
			const page = {
				"/page.ts": `import { User } from "./types.ts"\n\nUser.assert({})\n`
			}
			for (const fw of [
				`export const routes = [() => import("../../page.ts")]\n`,
				`import.meta.glob("./*.js")\nrequire(process.env.PLUGIN)\nimport "../../page.ts"\n`
			]) {
				attest(await droppedThrough(fw, page)).equals([
					"meta",
					"~standard",
					"methods"
				])
			}
		})

		it("keeps what a dependency may read of a module it imports", async () => {
			attest(await droppedThrough(`import "../../types.ts"\n`)).snap(
				"types.ts exports User, which a dependency may read"
			)
		})
	})

	describe("ids", () => {
		it("names each module as the precompiler does", async () => {
			const files: Record<string, string> = {
				"C:\\app\\main.ts": `import { User } from "./types.ts"\n\nUser({})`,
				"C:\\app\\types.ts": types
			}
			// as Vite writes them on Windows
			const scanned = await scanProgram("test", [{ id: "C:/app/main.ts" }], {
				resolve: async (specifier, importer) =>
					win32.join(win32.dirname(importer), specifier).replace(/\\/g, "/"),
				readFile: id => files[win32.normalize(id)],
				isTransformed: () => true,
				idOf: win32.normalize,
				cwd: "C:\\app"
			})
			attest(typeof scanned !== "string" && scanned.entries).equals([
				"C:\\app\\main.ts"
			])
			attest(typeof scanned !== "string" && scanned.targets).equals({
				"C:\\app\\main.ts": { "./types.ts": "C:\\app\\types.ts" },
				"C:\\app\\types.ts": {}
			})
		})

		it("fails a bundle loading a file under two ids unalike", () => {
			const loaded: LoadedSources = new Map()
			addLoaded(loaded, "/app/main.ts", "User({})")
			addLoaded(loaded, "/app/main.ts", "User.assert({})")
			addLoaded(loaded, "/app/main.ts", "User({})")
			attest(
				unseenProblemOf(
					{
						key: "test",
						entries: ["/app/main.ts"],
						modules: {
							"/app/main.ts": { source: "User({})", transformed: true }
						},
						targets: { "/app/main.ts": {} },
						arkImports: {},
						dynamicImports: [],
						exposed: []
					},
					{ entries: ["/app/main.ts"], modules: ["/app/main.ts"], edges: [] },
					loaded,
					new Set(),
					"/app"
				)
			).equals(
				writeUnseenMessage(
					"it built main.ts from other code than it read, as a plugin ahead of arktype's rewrote it after it read its file",
					"List precompile.vite() right after your framework's plugin and ahead of react(), a Babel plugin or another that rewrites modules, or set prune: false to build them whole"
				)
			)
		})
	})

	describe("esbuild", () => {
		// arktype's packages resolve to their source in this repo
		const conditions = ["ark-ts", "production"]

		const root = writeFixture(
			{
				"types.ts": types,
				"main.ts": `import { type } from "arktype"
import { User } from "./types.ts"

const out = User({ name: 5 })
console.log(out instanceof type.errors ? out.summary : out)
`,
				"allowing.ts": `import { type } from "arktype"

const User = type({ name: "string" })
console.log(User.allows({ name: 5 }), User.allows({ name: "Ada" }))
`
			},
			fromHere("temp", "pruned")
		)

		const bundle = async (
			opts: PrecompileUnpluginOptions = {},
			{ plugins = [], ...options }: BuildOptions = {}
		) => {
			const { outputFiles } = await build({
				...(!options.stdin && { entryPoints: [join(root, "main.ts")] }),
				bundle: true,
				write: false,
				format: "esm",
				minify: true,
				conditions,
				logLevel: "silent",
				plugins: [
					precompile.esbuild({ preset: "smallest", conditions, ...opts }),
					...plugins
				],
				...options
			})
			return outputFiles![0].text
		}

		describe("a define writing code no module's text holds", () => {
			const reading = {
				stdin: {
					contents: `import { User } from "./types.ts"
const local = User
console.log(READ, String(User({ name: 5 })))
`,
					resolveDir: root
				}
			}

			it("builds whole where one names a binding, so the read throws", async () => {
				const options = { ...reading, define: { READ: "local.expression" } }
				const warnings = await warningsOf({ preset: undefined }, options)
				attest(warnings.map(({ text }) => text)).snap([
					"prune: off, because define names local in local.expression, which may read a validator where no module's text shows it, so the build keeps every member of its validators. Set prune: false to build them whole without this warning."
				])
				const out = runBundle(await bundle({ preset: undefined }, options))
				attest(out.stderr.includes("expression isn't precompiled")).equals(true)
			})

			it("prunes where each names a literal or a global", async () => {
				const options = {
					...reading,
					define: {
						READ: `"literal"`,
						"process.env.NODE_ENV": `"production"`,
						global: "globalThis"
					}
				}
				attest(await warningsOf({ preset: undefined }, options)).equals([])
				const js = await bundle({ preset: undefined }, options)
				attest(js.includes("~standard")).equals(false)
				attest(run(js)).equals("literal name must be a string\n")
			})
		})

		const warningsOf = async (
			opts: PrecompileUnpluginOptions,
			{ plugins = [], ...options }: BuildOptions = {}
		) =>
			(
				await build({
					...(!options.stdin && { entryPoints: [join(root, "main.ts")] }),
					absWorkingDir: root,
					bundle: true,
					write: false,
					format: "esm",
					conditions,
					logLevel: "silent",
					plugins: [precompile.esbuild({ conditions, ...opts }), ...plugins],
					...options
				})
			).warnings

		it("leaves out of a production build what no read needs", async () => {
			const whole = await bundle({ prune: false })
			attest(run(whole)).snap("name must be a string\n")
			attest(whole.includes("~standard")).equals(true)
			for (const preset of ["smallest", undefined] as const) {
				const pruned = await bundle({ preset })
				attest(run(pruned)).equals(run(whole))
				attest(pruned.includes("~standard")).equals(false)
			}
		})

		it("drops what reads what no validator's issues hold", async () => {
			const files = writeFixture(
				{
					"user.ts": `import { type } from "arktype"\n\nconsole.log(type({ name: "string" })({ name: 5 }).toString())\n`,
					"tagged.ts": `import { type } from "arktype"\n\nconsole.log(type({ tags: "string[]" })({ tags: ["a", 5] }).toString())\n`,
					"keyed.ts": `import { type } from "arktype"\n\nconsole.log(type({ "first-name": "string" })({ "first-name": 5 }).toString())\n`,
					"flagged.ts": `import { type } from "arktype"

const Flagged = type({ name: "string" }).narrow((_, ctx) =>
	ctx.reject({ path: ["flags", 0], problem: "is unset" })
)

console.log(Flagged({ name: "Ada" }).toString())
`,
					"asserted.ts": `import { type } from "arktype"

try {
	type({ name: "string", age: "number" }).assert({ name: 5, age: "5" })
} catch (e) {
	console.log((e as Error).message)
}
`,
					"island.ts": `import { type } from "arktype"

try {
	// @ark-runtime
	type({ name: "string", age: "number" }).assert({ name: 5, age: "5" })
} catch (e) {
	console.log((e as Error).message)
}
`,
					"exported.ts": `import { type } from "arktype"

export const User = type({ name: "string" })

console.log(User({ name: 5 }).toString())
`
				},
				fromHere("temp", "prunedIssues")
			)
			const bundleOf = (entry: string) =>
				bundle({ preset: undefined }, { entryPoints: [join(files, entry)] })
			const user = await bundleOf("user.ts")
			attest(run(user)).snap("name must be a string\n")
			attest(user.includes("`[${")).equals(false)
			attest(user.includes("JSON.stringify(")).equals(false)
			attest(user.includes(".text?.(")).equals(false)
			const tagged = await bundleOf("tagged.ts")
			attest(run(tagged)).snap("tags[1] must be a string\n")
			attest(tagged.includes("`[${")).equals(true)
			attest(tagged.includes("JSON.stringify(")).equals(false)
			attest(tagged.includes(".text?.(")).equals(false)
			// a key that isn't an identifier is bracketed, as arktype writes it
			const keyed = await bundleOf("keyed.ts")
			attest(run(keyed)).snap('["first-name"] must be a string\n')
			attest(keyed.includes("JSON.stringify(")).equals(true)
			// a callback may raise an issue at any path, with any text
			const flagged = await bundleOf("flagged.ts")
			attest(run(flagged)).snap("flags[0] is unset\n")
			attest(flagged.includes("`[${")).equals(true)
			attest(flagged.includes(".text?.(")).equals(true)
			const asserted = await bundleOf("asserted.ts")
			attest(run(asserted)).snap(`name must be a string
age must be a number
`)
			attest(asserted.includes("._t")).equals(false)
			// arktype's own errors write a TraversalError's message
			const island = await bundleOf("island.ts")
			attest(run(island)).snap(`
  • name must be a string (was a number)
  • age must be a number (was a string)
`)
			attest(island.includes("._t")).equals(true)
			// an entry's export is read whole, in a bundle flattening nothing
			const exported = await bundle(
				{ preset: undefined },
				{
					entryPoints: [join(files, "exported.ts")],
					splitting: true,
					outdir: join(files, "out")
				}
			)
			attest(run(exported)).snap("name must be a string\n")
			attest(exported.includes(".text?.(")).equals(false)
		})

		it("allows as a boolean where a narrow returns otherwise", async () => {
			const files = writeFixture(
				{
					"main.ts": `import { type } from "arktype"

const Named = type("string").narrow(s => s.length as never)

console.log(Named.allows("Ada"), Named.allows(""))
`
				},
				fromHere("temp", "prunedNarrow")
			)
			const js = await bundle(
				{ preset: undefined },
				{ entryPoints: [join(files, "main.ts")] }
			)
			attest(run(js)).snap("true false\n")
		})

		it("finds issues as a call returns where no read calls a validator", async () => {
			const asserting = await bundle(
				{ preset: undefined },
				{
					stdin: {
						contents: `import { User } from "./types.ts"

let reads = 0
const counting = {
	get name() {
		reads++
		return 5
	}
}
User.allows(counting)
const allowsReads = reads
// rejected, then read as valid by the Apply finding its issues
const flipping = {
	get name() {
		return reads++ < 2 * allowsReads ? 5 : "Ada"
	}
}
for (const data of [{ name: 5 }, flipping]) {
	try {
		User.assert(data)
	} catch (e) {
		console.log((e as Error).message)
	}
}
`,
						resolveDir: root,
						loader: "ts"
					}
				}
			)
			attest(run(asserting)).snap("name must be a string\nis invalid\n")
			// errors finding their issues once read hold the data until then
			attest(asserting.includes("._d=")).equals(false)
			attest((await bundle({ preset: undefined })).includes("._d=")).equals(
				true
			)
		})

		it("returns what a narrow finds valid once asked again, as arktype does", async () => {
			const files = writeFixture(
				{
					"main.ts": `import { type } from "arktype"

let calls = 0
const isEvenCall = (s: string) => ++calls % 2 === 0
const Flips = type("string").narrow(isEvenCall)
const Holds = type({ flips: Flips, d: "string = 'x'" })
const matches = /a/g
const Matches = type("string").narrow(s => matches.test(s))
console.log(
	Flips("a"),
	Flips.assert("b"),
	Holds({ flips: "c", d: "" }),
	Holds.assert({ flips: "d", d: "" }),
	Matches("a"),
	Matches("a"),
	Matches("a")
)
`
				},
				fromHere("temp", "flippingNarrow")
			)
			const plain = runPlain(files)
			attest(plain).snap(
				"a b { flips: 'c', d: '' } { flips: 'd', d: '' } a a a\n"
			)
			for (const preset of [undefined, "smallest"] as const) {
				attest(
					run(
						await bundle({ preset }, { entryPoints: [join(files, "main.ts")] })
					)
				).equals(plain)
			}
		})

		it("names an undeclared key as the whole build does", async () => {
			const files = writeFixture(
				{
					"main.ts": `import { type } from "arktype"

const Strict = type({ name: "string" }).onUndeclaredKey("reject")
console.log(Strict({ name: "Ada", 0: 1, "a-b": 2 }).toString())
`
				},
				fromHere("temp", "prunedUndeclared")
			)
			const options = { entryPoints: [join(files, "main.ts")] }
			const pruned = await bundle({ preset: undefined }, options)
			attest(run(pruned)).snap(
				'["0"] must be removed\n["a-b"] must be removed\n'
			)
			attest(
				run(await bundle({ preset: undefined, prune: false }, options))
			).equals(run(pruned))
		})

		it("leaves out what no read of a map holding validators needs", async () => {
			const warnings = await warningsOf(
				{ preset: undefined },
				{
					stdin: {
						contents: `import { User } from "./types.ts"

const schemas = { user: User }
console.log(String(schemas.user({ name: 5 })))
`,
						resolveDir: root,
						loader: "ts"
					}
				}
			)
			attest(warnings.map(warning => warning.text)).equals([])
		})

		it("throws from from() where no read asserts", async () => {
			const js = await bundle(
				{ preset: undefined },
				{
					stdin: {
						contents: `import { User } from "./types.ts"

try {
	User.from({ name: 5 })
} catch (e) {
	console.log((e as Error).message)
}
`,
						resolveDir: root,
						loader: "ts"
					}
				}
			)
			attest(run(js)).snap("name must be a string\n")
		})

		it("bundles a program reading only .allows as its checkers", async () => {
			const stdin = {
				contents: `import "./allowing.ts"`,
				resolveDir: root,
				loader: "ts" as const
			}
			const allowing = await bundle({}, { stdin })
			attest(run(allowing)).snap("false true\n")
			// neither what writes an issue nor a validator around its checker
			attest([allowing.includes("_at"), allowing.includes("allows")]).equals([
				false,
				false
			])
			attest(
				allowing.length <=
					(await bundle({ preset: undefined }, { stdin })).length
			).equals(true)
		})

		it("writes a validator called with its data alone as its Apply", async () => {
			const applied = await bundle({ preset: undefined })
			attest(run(applied)).snap("name must be a string\n")
			attest(applied.includes("allows")).equals(false)
			// a call passing more keeps where the validator reads it
			const handling = {
				contents: `import { User } from "./types.ts"

console.log(User({ name: 5 }, undefined, () => "handled"))
`,
				resolveDir: root,
				loader: "ts"
			} as const
			for (const errors of [undefined, "none"] as const) {
				attest(
					run(await bundle({ preset: undefined, errors }, { stdin: handling }))
				).equals("handled\n")
			}
		})

		it("keeps a build other than for production whole, unless prune: true", async () => {
			const development = { conditions: ["ark-ts"] }
			attest(await bundle({}, development)).equals(
				await bundle({ prune: false }, development)
			)
			attest(
				(await bundle({ prune: true }, development)).includes("~standard")
			).equals(false)
		})

		it("keeps a bundle whole where a plugin after it may load a module", async () => {
			const plugins = [{ name: "after", setup: () => {} }]
			attest(await bundle({}, { plugins })).equals(
				await bundle({ prune: false }, { plugins })
			)
			attest(
				(await warningsOf({}, { plugins })).map(warning => warning.text)
			).snap([
				"prune: off, because a plugin follows arktype's among esbuild's plugins, which may load a module after it reads the bundle, so the build keeps every member of its validators. Move arktype's plugin last, or set prune: false to build them whole without this warning."
			])
			attest(await warningsOf({ prune: false }, { plugins })).equals([])
			const last = await build({
				entryPoints: [join(root, "main.ts")],
				bundle: true,
				write: false,
				conditions,
				logLevel: "silent",
				plugins: [...plugins, precompile.esbuild({ conditions })]
			})
			attest(last.warnings).equals([])
			attest(last.outputFiles[0].text.includes("~standard")).equals(false)
			const errors = await bundle({ prune: true }, { plugins }).then(
				() => [],
				(e: BuildFailure) => e.errors.map(error => error.text)
			)
			attest(errors).equals([pruneBeforePluginMessage])
		})

		it("warns where it keeps each member members leaves to it", async () => {
			const main = join(root, "main.ts")
			const source = readFileSync(main, "utf8")
			writeFileSync(
				main,
				`${source}declare const send: (o: object) => void\nsend({ User })\n`
			)
			const textsOf = async (opts: PrecompileUnpluginOptions) =>
				(await warningsOf(opts)).map(warning => warning.text)
			const members = Object.fromEntries(
				everyMember.map(member => [member, true])
			)
			try {
				attest(await textsOf({ preset: undefined })).snap([
					"prune: keeping assert, meta, ~standard and methods, because the validator at types.ts:3:21 is lost where main.ts:7:6 passes it to send, which the build can't follow. Set assert, meta, ~standard and methods in members, each true where code reads it, like ~standard where a library validates with it, else false, to build without this warning."
				])
				attest(await textsOf({ members: { assert: true } })).snap([
					"prune: keeping meta, ~standard and methods, because the validator at types.ts:3:21 is lost where main.ts:7:6 passes it to send, which the build can't follow. Set meta, ~standard and methods in members, each true where code reads it, like ~standard where a library validates with it, else false, to build without this warning."
				])
				attest(await textsOf({ members })).equals([])
				// setting what it kept changes nothing it writes
				attest(await bundle({ members })).equals(await bundle())
			} finally {
				writeFileSync(main, source)
			}
		})

		it("fails a bundle holding a module another plugin loaded, writing nothing", async () => {
			const outdir = join(root, "out")
			const loader: Plugin = {
				name: "loader",
				setup: build =>
					build.onLoad({ filter: /[/\\]main\.ts$/ }, () => ({
						contents: `import { User } from "./types.ts"\n\nconsole.log(User.assert({ name: "Ada" }))\n`,
						loader: "ts",
						resolveDir: root
					}))
			}
			const result = await build({
				entryPoints: [join(root, "main.ts")],
				absWorkingDir: root,
				bundle: true,
				outdir,
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [
					loader,
					precompile.esbuild({ preset: "smallest", conditions })
				]
			}).catch((e: { errors: { text: string }[] }) => e)
			attest(
				"errors" in result && result.errors.map(error => error.text)
			).equals([writeUnseenMessage("another plugin loaded main.ts")])
			attest(existsSync(join(outdir, "main.js"))).equals(false)
		})

		it("fails a bundle importing a module unlike its scan read it", async () => {
			const files = writeFixture(
				{
					"types.ts": types,
					"reader.ts": `import { User } from "./types.ts"\n\nexport const read = () => User({})\n`,
					"asserter.ts": `import { User } from "./types.ts"\n\nexport const read = () => User.assert({})\n`,
					"main.ts": `import { read } from "./reader.ts"\n\nconsole.log(read())\n`
				},
				fromHere("temp", "prunedResolved")
			)
			let res = 0
			// resolves reader.ts as the scan reads it, then as asserter.ts
			const swap: Plugin = {
				name: "swap",
				setup: build =>
					build.onResolve({ filter: /reader\.ts$/ }, () => ({
						path: join(files, res++ ? "asserter.ts" : "reader.ts")
					}))
			}
			const result = await build({
				entryPoints: [join(files, "main.ts")],
				absWorkingDir: files,
				bundle: true,
				write: false,
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [swap, precompile.esbuild({ preset: "smallest", conditions })]
			}).catch((e: { errors: { text: string }[] }) => e)
			attest(
				"errors" in result && result.errors.map(error => error.text)
			).equals([writeUnseenMessage("asserter.ts imports types.ts")])
		})

		it("prunes a module import() loads, which splitting builds as an entry", async () => {
			const files = writeFixture(
				{
					"types.ts": types,
					"reader.ts": `import { User } from "./types.ts"\n\nexport const read = () => User.allows({})\n`,
					"main.ts": `const { read } = await import("./reader.ts")\n\nconsole.log(read())\n`
				},
				fromHere("temp", "prunedSplit")
			)
			const { outputFiles } = await build({
				entryPoints: [join(files, "main.ts")],
				absWorkingDir: files,
				bundle: true,
				splitting: true,
				write: false,
				outdir: join(files, "out"),
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [precompile.esbuild({ preset: "smallest", conditions })]
			})
			writeFixture(
				Object.fromEntries(
					outputFiles!.map(({ path, text }) => [relative(files, path), text])
				),
				files
			)
			attest(
				spawnSync(process.execPath, [join(files, "out", "main.js")], {
					encoding: "utf8"
				}).stdout
			).snap("false\n")
			attest(
				outputFiles!.some(({ text }) => text.includes("~standard"))
			).equals(false)
		})

		it("reads an entry from stdin or named from its working directory without ./", async () => {
			const stdin = {
				contents: readFileSync(join(root, "main.ts"), "utf8"),
				resolveDir: root,
				loader: "ts"
			} as const
			const cwd = { absWorkingDir: root, outdir: "out" }
			for (const options of [
				{ stdin },
				{ entryPoints: ["main.ts"], ...cwd },
				{ entryPoints: [{ in: "main.ts", out: "main" }], ...cwd },
				{ entryPoints: { main: "main.ts" }, ...cwd }
			] as BuildOptions[]) {
				const js = await bundle({}, options)
				attest(run(js)).snap("name must be a string\n")
				attest(js.includes("~standard")).equals(false)
			}
		})

		it("rereads what each rebuild reads", async () => {
			const files = writeFixture(
				{
					"types.ts": types,
					"main.ts": `${readFileSync(join(root, "main.ts"))}`
				},
				fromHere("temp", "prunedRebuilt")
			)
			const main = join(files, "main.ts")
			const ctx = await context({
				entryPoints: [main],
				bundle: true,
				write: false,
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [precompile.esbuild({ preset: "smallest", conditions })]
			})
			try {
				const first = (await ctx.rebuild()).outputFiles![0].text
				attest(run(first)).snap("name must be a string\n")
				writeFileSync(
					main,
					`import { User } from "./types.ts"\n\nconsole.log(User.assert({ name: "Ada" }))\n`
				)
				const second = (await ctx.rebuild()).outputFiles![0].text
				attest(run(second)).snap("{ name: 'Ada' }\n")
			} finally {
				await ctx.dispose()
			}
		})

		it("writes again as a rebuild's edit changes how the program fails", async () => {
			const files = writeFixture(
				{ "types.ts": types, "main.ts": callingFrom("./types.ts") },
				fromHere("temp", "prunedRebuiltFailure")
			)
			const main = join(files, "main.ts")
			const options = (): BuildOptions => ({
				entryPoints: [main],
				bundle: true,
				write: false,
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [precompile.esbuild({ errors: "none", conditions })]
			})
			const ctx = await context(options())
			try {
				await ctx.rebuild()
				writeFileSync(main, assertingFrom("./types.ts"))
				const rebuilt = (await ctx.rebuild()).outputFiles![0].text
				attest(run(rebuilt)).snap("is invalid\n")
				attest(rebuilt).equals((await build(options())).outputFiles![0].text)
			} finally {
				await ctx.dispose()
			}
		})
	})

	describe("linking", () => {
		const units = {
			"~arktype/a": `import * as runtime from "arktype/runtime"

const aAllows = /* @__PURE__ */ runtime.props({ name: runtime.string })

export { aAllows }
`,
			"~arktype/create":
				"export const create = allows => data => allows(data)\n"
		}

		const main = `import { aAllows as $ark_aAllows } from "~arktype/a"
import { create as $ark_create } from "~arktype/create"

export const A = /* @__PURE__ */ $ark_create($ark_aAllows)
`

		// what a module creating `A` from its source links to
		const linkedMain = (code: string, modules: Record<string, string> = {}) =>
			linkBundle(
				{ "/main.ts": { source: "export const A = type({})", code } },
				{ ...units, ...modules }
			)!.sites["/main.ts"].code

		it("writes a checker read once where it's read", () => {
			attest(linkedMain(main))
				.snap(`import { aAllows as $ark_aAllows } from "~arktype/a"
import { create as $ark_create } from "~arktype/create"
import * as $ark_runtime from "arktype/runtime"

export const A = /* @__PURE__ */ $ark_create(/* @__PURE__ */ $ark_runtime.props({ name: $ark_runtime.string }))
`)
		})

		it("keeps a checker read twice", () => {
			const code = `${main}export const B = /* @__PURE__ */ $ark_create($ark_aAllows)\n`
			attest(linkedMain(code)).equals(code)
		})

		it("keeps a checker a statement writes to", () => {
			attest(
				linkedMain(main, {
					"~arktype/a": units["~arktype/a"].replace(
						"export {",
						"aAllows.t = data => data\n\nexport {"
					)
				})
			).equals(main)
		})

		it("keeps a checker reading a global the reader declares", () => {
			const code = main.replace("export", "const String = 0\n\nexport")
			attest(
				linkedMain(code, {
					"~arktype/a": units["~arktype/a"].replace("runtime.string", "String")
				})
			).equals(code)
		})

		describe("a checker a site creates its validator from", () => {
			const b = `import * as runtime from "arktype/runtime"
import { aAllows } from "~arktype/a"

const bAllows = /* @__PURE__ */ runtime.props({ a: aAllows })

export { bAllows }
`
			const code = `${main}import { bAllows as $ark_bAllows } from "~arktype/b"

export const B = /* @__PURE__ */ $ark_create($ark_bAllows)
`
			const linkedWith = (code: string, exposesAllows: boolean) =>
				linkBundle(
					{ "/main.ts": { source: "export const A = type({})", code } },
					{ ...units, "~arktype/b": b },
					{ exposesAllows }
				)!

			it("is declared as the validator where validators expose allows", () => {
				const linked = linkedWith(code, true)
				const [declared] = Object.entries(linked.modules).filter(
					([specifier]) => specifier.startsWith("~arktype/a-")
				)
				attest(normalized(`// ${declared[0]}\n${declared[1]}`))
					.snap(`// ~arktype/a-#0
import * as runtime from "arktype/runtime"
import { create } from "~arktype/create"

const aAllows = /* @__PURE__ */ create(/* @__PURE__ */ runtime.props({ name: runtime.string }))

export { aAllows }
`)
				attest(normalized(linked.sites["/main.ts"].code))
					.snap(`import { aAllows as $ark_aAllows } from "~arktype/a-#0"
import { create as $ark_create } from "~arktype/create"
import * as $ark_runtime from "arktype/runtime"

export { $ark_aAllows as A }
import { bAllows as $ark_bAllows } from "~arktype/b-#1"

export const B = /* @__PURE__ */ $ark_create(/* @__PURE__ */ $ark_runtime.props({ a: /* @__PURE__ */ $ark_runtime.allowsOf($ark_aAllows) }))
`)
			})

			it("counts where validators don't", () => {
				const linked = linkedWith(code, false)
				attest(linked.unexposed).equals(1)
				attest(normalized(linked.sites["/main.ts"].code))
					.snap(`import { aAllows as $ark_aAllows } from "~arktype/a"
import { create as $ark_create } from "~arktype/create"
import * as $ark_runtime from "arktype/runtime"

export const A = /* @__PURE__ */ $ark_create($ark_aAllows)
import { bAllows as $ark_bAllows } from "~arktype/b"

export const B = /* @__PURE__ */ $ark_create(/* @__PURE__ */ $ark_runtime.props({ a: $ark_aAllows }))
`)
			})

			it("keeps one two sites create validators from, each its own", () => {
				const twice = `${code}export const C = /* @__PURE__ */ $ark_create($ark_aAllows)\n`
				const linked = linkedWith(twice, true)
				attest(linked.unexposed).equals(0)
				attest(linked.modules["~arktype/a"]).equals(units["~arktype/a"])
			})
		})

		it("declares a one-chunk bundle's units in one module, as its sites read them", () => {
			const linked = linkBundle(
				{
					"/main.ts": {
						source: "export const A = type({})",
						code: `import { aAllows as $ark_aAllows } from "~arktype/a"
import { create as $ark_create } from "~arktype/create"

export const A = /* @__PURE__ */ $ark_create($ark_aAllows)
`
					}
				},
				{
					...units,
					"~arktype/a": units["~arktype/a"].replace(
						"export {",
						"const a = [aAllows]\n\nexport { a, "
					)
				},
				{ isOneChunk: true }
			)!
			attest(
				normalized(
					Object.entries(linked.modules).map(
						([specifier, code]) => `// ${specifier}\n${code}`
					)
				)
			).snap([
				'// ~arktype/#0\nimport * as runtime from "arktype/runtime"\nconst create = allows => data => allows(data)\nconst aAllows = /* @__PURE__ */ create(/* @__PURE__ */ runtime.props({ name: runtime.string }))\nexport { aAllows, create }'
			])
			attest(normalized(linked.sites["/main.ts"].code))
				.snap(`import { aAllows as $ark_aAllows } from "~arktype/#0"
import { create as $ark_create } from "~arktype/#0"

export { $ark_aAllows as A }
`)
		})

		describe("a checker a program writes often", () => {
			const often =
				'/* @__PURE__ */ runtime.optional(/* @__PURE__ */ runtime.units(["first", "second"]))'
			const unitsWriting = (call: string, count: number) =>
				Object.fromEntries(
					Array.from({ length: count }, (_, i) => [
						`~arktype/k${i}`,
						`import * as runtime from "arktype/runtime"

const k${i}Allows = /* @__PURE__ */ runtime.props({ k${i}: ${call} })

export { k${i}Allows }
`
					])
				)
			const reading = (count: number) =>
				Array.from(
					{ length: count },
					(_, i) =>
						`import { k${i}Allows as $ark_k${i}Allows } from "~arktype/k${i}"\nexport const K${i} = /* @__PURE__ */ $ark_create($ark_k${i}Allows)\nexport const L${i} = /* @__PURE__ */ $ark_create($ark_k${i}Allows)\n`
				).join("")
			const shared = (call: string, count: number, isOneChunk = false) =>
				linkBundle(
					{
						"/main.ts": {
							source: "export const A = type({})",
							code: `import { create as $ark_create } from "~arktype/create"\n${reading(count)}`
						}
					},
					{ ...units, ...unitsWriting(call, count) },
					{ sharesChecks: true, isOneChunk }
				)!

			const moduleOf = (modules: Record<string, string>, name: string) =>
				Object.values(modules).find(code => code.includes(`const ${name} =`))!

			it("is made once, each reading that", () => {
				const { modules } = shared(often, 7)
				// its units are shared in turn, as long and as often written
				attest(
					Object.values(modules).filter(code =>
						code.includes("= /* @__PURE__ */ runtime.optional(")
					).length
				).equals(1)
				attest(
					Object.values(modules).filter(code =>
						code.includes(
							'= /* @__PURE__ */ runtime.units(["first", "second"])'
						)
					).length
				).equals(1)
				attest(
					moduleOf(modules, "k0Allows").includes("runtime.optional")
				).equals(false)
			})

			it("is written where it's written less than a shared one costs", () => {
				attest(
					moduleOf(shared(often, 6).modules, "k0Allows").includes(often)
				).equals(true)
				const short = "/* @__PURE__ */ runtime.units([1, 2])"
				attest(
					moduleOf(shared(short, 9).modules, "k0Allows").includes(short)
				).equals(true)
			})

			it("is written where it reads what's declared beside it", () => {
				const reads = `/* @__PURE__ */ runtime.optional(/* @__PURE__ */ runtime.props({ held, first: runtime.string, second: runtime.string }))`
				attest(
					moduleOf(shared(reads, 7).modules, "k0Allows").includes(reads)
				).equals(true)
			})

			it("leaves what a site creates its validator from, already linked", () => {
				const { sites } = linkBundle(
					{ "/main.ts": { source: "export const A = type({})", code: main } },
					units,
					{ sharesChecks: true, isOneChunk: true }
				)!
				attest(sites["/main.ts"].code.includes("$ark_create(")).equals(true)
			})
		})

		it("renames a module it writes into, which another may read unlinked", () => {
			const b = `import * as runtime from "arktype/runtime"
import { aAllows } from "~arktype/a"

const bAllows = /* @__PURE__ */ runtime.props({ a: aAllows })

export { bAllows }
`
			const linked = linkBundle(
				{
					"/main.ts": {
						source: "export const B = type({})",
						code: `import { bAllows as $ark_bAllows } from "~arktype/b"
import { create as $ark_create } from "~arktype/create"

export const B = /* @__PURE__ */ $ark_create($ark_bAllows)
export const C = /* @__PURE__ */ $ark_create($ark_bAllows)
`
					}
				},
				{ ...units, "~arktype/b": b }
			)!
			attest(
				normalized(
					Object.entries(linked.modules).map(
						([specifier, code]) => `// ${specifier}\n${code}`
					)
				)
			).snap([
				'// ~arktype/a\nimport * as runtime from "arktype/runtime"\n\nconst aAllows = /* @__PURE__ */ runtime.props({ name: runtime.string })\n\nexport { aAllows }\n',
				"// ~arktype/create\nexport const create = allows => data => allows(data)\n",
				'// ~arktype/b-#0\nimport * as runtime from "arktype/runtime"\nimport { aAllows } from "~arktype/a"\n\nconst bAllows = /* @__PURE__ */ runtime.props({ a: /* @__PURE__ */ runtime.props({ name: runtime.string }) })\n\nexport { bAllows }\n'
			])
			attest(normalized(linked.sites["/main.ts"].code))
				.snap(`import { bAllows as $ark_bAllows } from "~arktype/b-#0"
import { create as $ark_create } from "~arktype/create"

export const B = /* @__PURE__ */ $ark_create($ark_bAllows)
export const C = /* @__PURE__ */ $ark_create($ark_bAllows)
`)
		})
	})

	describe("vite", () => {
		const conditions = ["ark-ts"]

		const root = writeFixture(
			{
				"types.ts": types,
				"main.ts": `import { type } from "arktype"
import { User } from "./types.ts"

const out = User({ name: 5 })
console.log(out instanceof type.errors ? out.summary : out)
`,
				"index.html": `<!doctype html>
<script type="module" src="/main.ts"></script>
`
			},
			fromHere("temp", "prunedVite")
		)

		// Vite reads its mode from NODE_ENV
		const bundle = async (
			opts: PrecompileUnpluginOptions = {},
			{
				plugins = [],
				following = [],
				lib = true,
				onwarn,
				define,
				at = root
			}: {
				at?: string
				plugins?: VitePlugin[]
				following?: VitePlugin[]
				lib?: boolean
				onwarn?: (warning: { message: string; plugin?: string }) => void
				define?: Record<string, unknown>
			} = {}
		) => {
			const { NODE_ENV } = process.env
			process.env.NODE_ENV = "production"
			try {
				const config: InlineConfig = {
					root: at,
					configFile: false,
					logLevel: "silent",
					...(define && { define }),
					plugins: [
						...plugins,
						precompile.vite({ conditions, ...opts }),
						...following
					],
					resolve: { conditions: [...conditions, ...defaultClientConditions] },
					build: {
						write: false,
						minify: true,
						...(lib && { lib: { entry: "main.ts", formats: ["es"] } }),
						...(onwarn && { rollupOptions: { onwarn } })
					}
				}
				const result = (await viteBuild(config)) as
					| Rolldown.RolldownOutput
					| Rolldown.RolldownOutput[]
				const [{ output }] = Array.isArray(result) ? result : [result]
				return output.find(chunk => chunk.type === "chunk")!.code
			} finally {
				if (NODE_ENV === undefined) delete process.env.NODE_ENV
				else process.env.NODE_ENV = NODE_ENV
			}
		}

		describe("a define writing code no module's text holds", () => {
			const warned = (warnings: string[]) => (warning: { message: string }) => {
				warnings.push(warning.message)
			}

			it("builds whole where one names a binding", async () => {
				const warnings: string[] = []
				const js = await bundle(
					{},
					{ define: { UNUSED: "local.expression" }, onwarn: warned(warnings) }
				)
				attest(
					warnings.some(warning =>
						warning.includes("define names local in local.expression")
					)
				).equals(true)
				attest(js.includes("~standard")).equals(true)
			})

			it("prunes where each names a literal, a global or plain data", async () => {
				const warnings: string[] = []
				const js = await bundle(
					{},
					{
						define: {
							LITERAL: `"literal"`,
							GLOBAL: "globalThis",
							DATA: { text: "two words" },
							COUNT: 1
						},
						onwarn: warned(warnings)
					}
				)
				attest(warnings.filter(warning => warning.includes("prune"))).equals([])
				attest(js.includes("~standard")).equals(false)
			})
		})

		it("leaves out of a production build what no read needs", async () => {
			const pruned = await bundle()
			const whole = await bundle({ prune: false })
			attest(run(pruned)).snap("name must be a string\n")
			attest(run(whole)).equals(run(pruned))
			attest(whole.includes("~standard")).equals(true)
			attest(pruned.includes("~standard")).equals(false)
			// nor what reads an index, which no validator's issues hold
			attest(whole.includes("`[${")).equals(true)
			attest(pruned.includes("`[${")).equals(false)
		})

		it("builds a barrel re-exporting what arktype/runtime lacks for sites to read", async () => {
			const barrel = writeFixture(
				{ ...arkBarrel(".ts"), "index.html": "" },
				fromHere("temp", "prunedViteBarrel")
			)
			attest(run(await bundle({}, { at: barrel }))).equals(
				"name must be a string x\n"
			)
		})

		it("leaves out what no read needs where a module accepts hot updates", async () => {
			const main = join(root, "main.ts")
			const source = readFileSync(main, "utf8")
			writeFileSync(
				main,
				`${source}\nif (import.meta.hot) import.meta.hot.accept()\n`
			)
			try {
				const pruned = await bundle()
				attest(run(pruned)).snap("name must be a string\n")
				attest(pruned.includes("~standard")).equals(false)
			} finally {
				writeFileSync(main, source)
			}
		})

		it("warns where a module reads import.meta.glob", async () => {
			const main = join(root, "main.ts")
			const source = readFileSync(main, "utf8")
			writeFileSync(main, `${source}import.meta.glob("./*.ts")\n`)
			const warnings: string[] = []
			try {
				// Rolldown also warns where plugins take most of a build's time
				await bundle(
					{},
					{
						onwarn: warning => {
							if (warning.plugin === "arktype") warnings.push(warning.message)
						}
					}
				)
				attest(warnings).snap([
					"prune: off, because main.ts:6:1 reads import.meta.glob, which may load modules it can't name, so the build keeps every member of its validators. Set prune: false to build them whole without this warning."
				])
				warnings.length = 0
				// which builds it as it was built
				const whole = await bundle(
					{ prune: false },
					{
						onwarn: warning => {
							if (warning.plugin === "arktype") warnings.push(warning.message)
						}
					}
				)
				attest(warnings).equals([])
				attest(whole).equals(await bundle())
			} finally {
				writeFileSync(main, source)
			}
		})

		it("leaves out what no read needs where a module imports a file as a string", async () => {
			const main = join(root, "main.ts")
			const source = readFileSync(main, "utf8")
			writeFileSync(join(root, "notes.md"), "# notes\n")
			writeFileSync(
				main,
				`${source}\nimport notes from "./notes.md?raw"\nconsole.log(notes)\n`
			)
			try {
				const pruned = await bundle()
				attest(run(pruned)).snap("name must be a string\n# notes\n\n")
				attest(pruned.includes("~standard")).equals(false)
			} finally {
				writeFileSync(main, source)
			}
		})

		it("leaves out what no read needs where a module only stripped code imports is refused", async () => {
			const main = join(root, "main.ts")
			const source = readFileSync(main, "utf8")
			const files = {
				"route.ts": `import { session } from "./context.ts"\nexport const loader = () => session\nexport const view = "view"\n`,
				"context.ts": `import { db } from "./db.server.ts"\nexport const session = db\n`,
				"db.server.ts": `export const db = "db"\n`
			}
			for (const [name, text] of Object.entries(files))
				writeFileSync(join(root, name), text)
			writeFileSync(
				main,
				`${source}\nimport { view } from "./route.ts"\nconsole.log(view)\n`
			)
			// as React Router refuses a .server module in the client build, and
			// removes a route's loader after arktype's plugin reads it
			const refusing: VitePlugin = {
				name: "refusing",
				enforce: "pre",
				resolveId: id => {
					if (id.endsWith(".server.ts")) throw new Error(`refused ${id}`)
				}
			}
			const stripping: VitePlugin = {
				name: "stripping",
				transform: (code, id) =>
					id.endsWith("route.ts") ?
						code.replace(/^.*(?:context|loader).*$/gm, "")
					:	undefined
			}
			const warnings: string[] = []
			try {
				const pruned = await bundle(
					{},
					{
						plugins: [refusing, stripping],
						onwarn: warning => {
							if (warning.plugin === "arktype") warnings.push(warning.message)
						}
					}
				)
				attest(run(pruned)).snap("name must be a string\nview\n")
				attest(pruned.includes("~standard")).equals(false)
				attest(warnings).equals([])
			} finally {
				writeFileSync(main, source)
				for (const name in files) rmSync(join(root, name))
			}
		})

		it("reads a page's module scripts", async () => {
			const pruned = await bundle({}, { lib: false })
			attest(pruned.includes("~standard")).equals(false)
			attest(
				(await bundle({ prune: false }, { lib: false })).includes("~standard")
			).equals(true)
		})

		it("keeps a page with an inline module script whole", async () => {
			const page = join(root, "index.html")
			const html = readFileSync(page, "utf8")
			writeFileSync(
				page,
				`${html}<script type="module">console.log(1)</script>\n`
			)
			try {
				attest(await bundle({}, { lib: false })).equals(
					await bundle({ prune: false }, { lib: false })
				)
			} finally {
				writeFileSync(page, html)
			}
		})

		// main.ts importing `imports` too, beside a component and a dependency
		// importing `dependency`
		const importing = async <t>(
			imports: string,
			run: () => Promise<t>,
			dependency = "../../config.ts"
		) => {
			const main = join(root, "main.ts")
			const source = readFileSync(main, "utf8")
			writeFileSync(join(root, "Form.svelte"), "<script>\n</script>\n")
			writeFileSync(join(root, "config.ts"), "export const debug = false\n")
			writeFileSync(main, `${imports}\n${source}`)
			writeFixture(
				{
					"package.json": "{}",
					"index.js": `import ${JSON.stringify(dependency)}\n`
				},
				join(root, "node_modules", "fw")
			)
			try {
				return await run()
			} finally {
				writeFileSync(main, source)
			}
		}

		// compiles a component and writes a virtual module, each reading
		// `read`, as Svelte's plugin and SvelteKit's do
		const framework = (read: string): VitePlugin => {
			const code = `import { User } from ${JSON.stringify(join(root, "types.ts"))}\nexport default ${read}\n`
			return {
				name: "framework",
				enforce: "pre",
				resolveId: id => (id === "$app/routes" ? "\0app/routes" : undefined),
				load: id => (id === "\0app/routes" ? code : undefined),
				transform: (_, id) => (id.endsWith(".svelte") ? code : undefined)
			}
		}

		it("reads a module another plugin compiles, like a Svelte component, or writes", async () => {
			for (const specifier of ["./Form.svelte", "$app/routes"]) {
				const pruned = await importing(
					`import read from "${specifier}"\nconsole.log(read)`,
					() =>
						bundle(
							{},
							{ plugins: [framework('User.assert({ name: "Ada" }).name')] }
						)
				)
				attest(run(pruned)).snap("Ada\nname must be a string\n")
				attest(pruned.includes("~standard")).equals(false)
			}
		})

		it("reads a component's script a plugin serves as a .ts module with no file, as Vue's does", async () => {
			const script = `import { User } from ${JSON.stringify(join(root, "types.ts"))}\nexport default User.assert({ name: "Ada" }).name\n`
			const vue: VitePlugin = {
				name: "vue",
				enforce: "pre",
				resolveId: id =>
					id.endsWith(".vue?vue&type=script&setup=true&lang.ts") ? id : (
						undefined
					),
				load: id =>
					id.endsWith(".vue?vue&type=script&setup=true&lang.ts") ? script : (
						undefined
					),
				transform: (_, id) =>
					id.endsWith(".vue") ?
						`import script from ${JSON.stringify(`${id}?vue&type=script&setup=true&lang.ts`)}\nexport default script\n`
					:	undefined
			}
			writeFileSync(
				join(root, "App.vue"),
				'<script setup lang="ts"></script>\n'
			)
			const pruned = await importing(
				'import read from "./App.vue"\nconsole.log(read)',
				() => bundle({}, { plugins: [vue] })
			)
			attest(run(pruned)).snap("Ada\nname must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
		})

		it("reads a virtual module written as a script, like Nuxt's", async () => {
			// as Nuxt resolves virtual:nuxt:...paths.mjs, an id the plugin
			// transforms, with no file to read it from
			const nuxt: VitePlugin = {
				name: "nuxt",
				enforce: "pre",
				resolveId: id => (id === "virtual:nuxt:paths.mjs" ? id : undefined),
				load: id =>
					id === "virtual:nuxt:paths.mjs" ?
						`import { User } from ${JSON.stringify(join(root, "types.ts"))}\nexport default User.assert({ name: "Ada" }).name\n`
					:	undefined
			}
			const warnings: string[] = []
			const pruned = await importing(
				'import read from "virtual:nuxt:paths.mjs"\nconsole.log(read)',
				() =>
					bundle(
						{},
						{
							plugins: [nuxt],
							onwarn: warning => {
								if (warning.plugin === "arktype") warnings.push(warning.message)
							}
						}
					)
			)
			attest(run(pruned)).snap("Ada\nname must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
			attest(warnings).equals([])
		})

		it("leaves out what no read needs where a dependency imports a module holding no validator", async () => {
			const pruned = await importing(
				'import "fw"\nimport { debug } from "./config.ts"\nconsole.log(debug)',
				() => bundle()
			)
			attest(run(pruned)).snap("false\nname must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
		})

		it("reads the program a dependency imports, as Nuxt's runtime imports its pages", async () => {
			writeFileSync(
				join(root, "page.ts"),
				'import { User } from "./types.ts"\nconsole.log(User.assert({ name: "Ada" }).name)\n'
			)
			const pruned = await importing(
				'import "fw"',
				() => bundle(),
				"../../page.ts"
			)
			attest(run(pruned)).snap("Ada\nname must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
		})

		it("fails a bundle where a plugin following it adds an import to a dependency", async () => {
			const adding: VitePlugin = {
				name: "adding",
				transform: (code, id) =>
					id.endsWith("/fw/index.js") ?
						`import "../../types.ts"\n${code}`
					:	undefined
			}
			const message = await importing('import "fw"', () =>
				bundle({}, { following: [adding] }).then(
					() => "",
					(e: Error) => stripVTControlCharacters(e.message)
				)
			)
			const expected = writeUnseenMessage(
				"the bundle it built reads more than the modules it read: types.ts exports User, which a dependency may read. Another plugin wrote or rewrote a module after it read it",
				"List precompile.vite() right after your framework's plugin and ahead of react(), a Babel plugin or another that rewrites modules, or set prune: false to build them whole"
			)
			attest(message.slice(-expected.length)).equals(expected)
		})

		it("builds a stylesheet another plugin emits as an entry, as Nuxt's server build does", async () => {
			writeFileSync(join(root, "theme.css"), "p { color: goldenrod }\n")
			const emitting: VitePlugin = {
				name: "emitting",
				buildStart() {
					this.emitFile({ type: "chunk", id: join(root, "theme.css?inline") })
				}
			}
			const pruned = await bundle({}, { plugins: [emitting] })
			attest(run(pruned)).snap("name must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
		})

		it("resolves each import as a require, which Rollup's CommonJS plugin answers without loading it", async () => {
			// resolves an alias, as Nuxt's ~/ is
			const aliasing: VitePlugin = {
				name: "aliasing",
				enforce: "pre",
				resolveId: specifier =>
					specifier.startsWith("~/") ?
						join(root, specifier.slice(2))
					:	undefined
			}
			// loads the module of the program an import resolves to, as
			// @rollup/plugin-commonjs does a .js file to tell whether it's
			// CommonJS, which waits on arktype's transform
			const loading: VitePlugin = {
				name: "loading",
				enforce: "pre",
				async resolveId(specifier, importer, options) {
					const custom = options.custom as
						| { "node-resolve"?: { isRequire?: boolean } }
						| undefined
					if (!importer || custom?.["node-resolve"]?.isRequire) return
					const resolved = await this.resolve(specifier, importer, {
						...options,
						skipSelf: true
					})
					if (resolved?.id.startsWith(root)) await this.load(resolved)
					return resolved
				}
			}
			// removed after, as tsc can't resolve its alias
			const aliased = join(root, "aliased.ts")
			writeFileSync(
				aliased,
				'import { User } from "~/types.ts"\nexport const name = User.assert({ name: "Ada" }).name\n'
			)
			try {
				const pruned = await importing(
					'import { name } from "~/aliased.ts"\nconsole.log(name)',
					() => bundle({}, { plugins: [aliasing, loading] })
				)
				attest(run(pruned)).snap("Ada\nname must be a string\n")
				attest(pruned.includes("~standard")).equals(false)
			} finally {
				rmSync(aliased)
			}
		})

		it("fails a bundle where a plugin ahead of it adds a read of a member it left out", async () => {
			const asserting: VitePlugin = {
				name: "asserting",
				enforce: "pre",
				transform: (code, id) =>
					id.endsWith("/main.ts") ?
						code.replace("User({ name: 5 })", "User.assert({ name: 5 })")
					:	undefined
			}
			const message = await bundle({}, { plugins: [asserting] }).then(
				() => "",
				(e: Error) => stripVTControlCharacters(e.message)
			)
			const expected = writeUnseenMessage(
				"the bundle it built reads more than the modules it read: a module reads assert of a validator. Another plugin wrote or rewrote a module after it read it",
				"List precompile.vite() right after your framework's plugin and ahead of react(), a Babel plugin or another that rewrites modules, or set prune: false to build them whole"
			)
			attest(message.slice(-expected.length)).equals(expected)
		})

		it("fails a bundle a plugin ahead of it rewrote to read what no validator bakes", async () => {
			for (const [name, read] of [
				["validate", 'schema["~standard"].validate({})'],
				["describe", "schema.expression"]
			]) {
				writeFixture(
					{
						"package.json": "{}",
						"index.js": `export const ${name} = schema => ${read}\n`
					},
					join(root, "node_modules", name)
				)
			}
			// it keeps every member, as it can't follow the call, but bakes
			// what the dependency's dataflow reads, which validates only
			const describing: VitePlugin = {
				name: "describing",
				enforce: "pre",
				transform: (code, id) =>
					id.endsWith("/main.ts") ?
						code.replace(/validate/g, "describe")
					:	undefined
			}
			const message = await importing(
				'import { validate } from "validate"\nimport { User as Read } from "./types.ts"\nconsole.log(validate(Read))',
				() =>
					bundle({}, { plugins: [describing] }).then(
						() => "",
						(e: Error) => stripVTControlCharacters(e.message)
					)
			)
			const expected = writeUnseenMessage(
				"the bundle it built reads more than the modules it read: a module reads expression of a validator. Another plugin wrote or rewrote a module after it read it",
				"List precompile.vite() right after your framework's plugin and ahead of react(), a Babel plugin or another that rewrites modules, or set prune: false to build them whole"
			)
			attest(message.slice(-expected.length)).equals(expected)
		})

		it("prunes a module a plugin ahead of it rewrites, reading it as it was built", async () => {
			// as a Babel plugin like the React Compiler's reformats every module
			const reformatting: VitePlugin = {
				name: "reformatting",
				enforce: "pre",
				transform: (code, id) =>
					id.endsWith("/main.ts") ?
						`${code.split("\n").join("\n\n")}\n// built`
					:	undefined
			}
			const pruned = await bundle({}, { plugins: [reformatting] })
			attest(run(pruned)).snap("name must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
		})

		describe("a module holding validators a plugin ahead of it rewrites", () => {
			const reformatting: VitePlugin = {
				name: "reformatting",
				enforce: "pre",
				transform: (code, id) =>
					id.endsWith("/types.ts") ?
						`${code.split("\n").join("\n\n")}\n// built`
					:	undefined
			}

			it("is written as it wrote the others", async () => {
				const rewritten = await bundle(
					{ optimize: "size" },
					{ plugins: [reformatting] }
				)
				attest(rewritten).equals(await bundle({ optimize: "size" }))
			})

			it("reads the units it declares in one function", async () => {
				const rewritten = await bundle({}, { plugins: [reformatting] })
				attest(run(rewritten)).snap("name must be a string\n")
				// its validator is the function's, declaring no unit twice
				attest(rewritten).equals(await bundle())
			})
		})

		it("prunes a module a plugin ahead of it splits, as TanStack Router does a route", async () => {
			writeFileSync(
				join(root, "route.ts"),
				'import { User } from "./types.ts"\nexport const name = User.assert({ name: "Ada" }).name\n'
			)
			const splitting: VitePlugin = {
				name: "splitting",
				enforce: "pre",
				resolveId: (id, importer) =>
					id === "./route.ts?split" && importer ?
						join(root, "route.ts?split")
					:	undefined,
				load: id =>
					id.endsWith("/route.ts?split") ?
						'import { User } from "./types.ts"\nexport const name = User.assert({ name: "Ada" }).name\n'
					:	undefined,
				transform: (_, id) =>
					id.endsWith("/route.ts") ?
						'export { name } from "./route.ts?split"\n'
					:	undefined
			}
			const pruned = await importing(
				'import { name } from "./route.ts"\nconsole.log(name)',
				() => bundle({}, { plugins: [splitting] })
			)
			attest(run(pruned)).snap("Ada\nname must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
		})

		it("writes again as a watch build's edit changes how the program fails", async () => {
			const files = writeFixture(
				{ "types.ts": types, "main.ts": callingFrom("./types.ts") },
				fromHere("temp", "prunedViteWatched")
			)
			const config = (outDir: string, watch: boolean): InlineConfig => ({
				root: files,
				configFile: false,
				logLevel: "silent",
				plugins: [precompile.vite({ conditions, errors: "none" })],
				resolve: { conditions: [...conditions, ...defaultClientConditions] },
				build: {
					outDir,
					minify: true,
					lib: { entry: "main.ts", formats: ["es"], fileName: "main" },
					watch: watch ? {} : null
				}
			})
			const built = (outDir: string) =>
				readFileSync(join(files, outDir, "main.js"), "utf8")
			const { NODE_ENV } = process.env
			process.env.NODE_ENV = "production"
			try {
				const watcher = (await viteBuild(
					config("watched", true)
				)) as Rolldown.RolldownWatcher
				let ends = 0
				await new Promise<void>((resolve, reject) =>
					watcher.on("event", event => {
						if (event.code === "ERROR") return reject(event.error)
						if (event.code === "BUNDLE_END") void event.result.close()
						if (event.code !== "END") return
						if (++ends === 1)
							writeFileSync(join(files, "main.ts"), assertingFrom("./types.ts"))
						else resolve()
					})
				)
				await watcher.close()
				await viteBuild(config("built", false))
				attest(run(built("watched"))).snap("is invalid\n")
				attest(built("watched")).equals(built("built"))
			} finally {
				if (NODE_ENV === undefined) delete process.env.NODE_ENV
				else process.env.NODE_ENV = NODE_ENV
			}
		})
	})

	describe("webpack and Rspack", () => {
		const compilers = {
			webpack: [webpack, precompile.webpack],
			Rspack: [rspack, precompile.rspack]
		} as const

		type Compiler = keyof typeof compilers

		const names = Object.keys(compilers) as Compiler[]

		const configOf = (
			name: Compiler,
			root: string,
			opts: PrecompileUnpluginOptions,
			config?: object
		) => ({
			mode: "production" as const,
			context: root,
			entry: "./main.js",
			target: "node",
			output: { path: join(root, "out", name), filename: "main.js" },
			plugins: [compilers[name][1]({ cwd: root, ...opts }) as never],
			...config
		})

		const built = (compiler: webpack.Compiler) =>
			new Promise<Stats | undefined>((resolve, reject) =>
				compiler.run((error, stats) =>
					compiler.close(() => (error ? reject(error) : resolve(stats)))
				)
			)

		// a production build's bundle, as the compiler writes it
		const bundle = async (
			name: Compiler,
			root: string,
			opts: PrecompileUnpluginOptions = {},
			config?: object
		) => {
			const stats = await built(
				(compilers[name][0] as typeof webpack)(
					configOf(name, root, opts, config)
				)
			)
			if (stats?.hasErrors()) throw new Error(stats.toString("errors-only"))
			return readFileSync(join(root, "out", name, "main.js"), "utf8")
		}

		const output = (js: string, cwd?: string) =>
			spawnSync(process.execPath, { input: js, encoding: "utf8", cwd }).stdout

		// the warnings a build ends with
		const collecting = (warnings: string[]) => ({
			apply: (compiler: webpack.Compiler) =>
				compiler.hooks.done.tap("collecting", stats => {
					for (const { message } of stats.toJson({ all: false, warnings: true })
						.warnings ?? [])
						warnings.push(message)
				})
		})

		// a build writing more than one file, as CommonJS
		const splitBundle = async (name: Compiler, root: string) => {
			const stats = await built(
				(compilers[name][0] as typeof webpack)(
					configOf(
						name,
						root,
						{},
						{
							output: {
								path: join(root, "out", name),
								filename: "main.cjs",
								chunkFilename: "[name].cjs"
							}
						}
					)
				)
			)
			if (stats?.hasErrors()) throw new Error(stats.toString("errors-only"))
		}

		const readsStandard = `import { User } from "./types.js"

console.log(typeof User["~standard"].validate)
`

		for (const name of names) {
			describe(name, () => {
				const fixture = (test: string, files: Record<string, string>) =>
					writeFixture(
						{ "types.js": types, ...files },
						fromHere("temp", "prunedWebpack", name, test)
					)

				const cacheOf = (root: string) =>
					name === "webpack" ?
						{
							cache: {
								type: "filesystem",
								cacheDirectory: join(root, "cache")
							}
						}
					:	{
							cache: {
								type: "persistent",
								storage: {
									type: "filesystem",
									directory: join(root, "cache")
								}
							}
						}

				it("builds a barrel re-exporting what arktype/runtime lacks for sites to read", async () => {
					const root = fixture("arkBarrel", arkBarrel(".js"))
					attest(output(await bundle(name, root))).equals(
						"name must be a string x\n"
					)
				})

				it("prints the name of a narrow an introspection reads, where nothing else reads its Type", async () => {
					const root = fixture("introspectedNarrow", {
						"types.js": `import { type } from "arktype"

const isPositive = n => n > 0

export const User = type({ age: type("number").narrow(isPositive) })
`,
						"main.js": `import { User } from "./types.js"

console.log(User.expression)
console.log(User.description)
`
					})
					// a minifier inlining isPositive leaves arktype nothing to name
					const js = await bundle(
						name,
						root,
						{},
						{ optimization: { minimize: false } }
					)
					attest(output(js)).snap(`{ age: number & isPositive }
{ age: a number and valid according to isPositive }
`)
				})

				describe("a define writing code no module's text holds", () => {
					const reading = {
						"main.js": `import { User } from "./types.js"
const local = User

console.log(READ, String(User({ name: 5 })))
`
					}

					const defining = (root: string, definitions: object) => {
						const warnings: string[] = []
						return bundle(
							name,
							root,
							{},
							{
								plugins: [
									compilers[name][1]({ cwd: root }) as never,
									new compilers[name][0].DefinePlugin(
										definitions as never
									) as never,
									collecting(warnings) as never
								]
							}
						).then(js => ({ js, warnings }))
					}

					it("builds whole where one names a binding", async () => {
						const { js, warnings } = await defining(
							fixture("define", reading),
							{ READ: "local.expression" }
						)
						attest(
							warnings.some(warning =>
								warning.includes("define names local in local.expression")
							)
						).equals(true)
						attest(js.includes("~standard")).equals(true)
					})

					it("reads code nested under a key", async () => {
						const { warnings } = await defining(
							fixture("defineNested", {
								"main.js": `import { User } from "./types.js"

console.log(READ.member, String(User({ name: 5 })))
`
							}),
							{ READ: { member: "User.description" } }
						)
						attest(
							warnings.some(warning =>
								warning.includes("define names User in User.description")
							)
						).equals(true)
					})

					it("prunes beside ProvidePlugin, which names modules", async () => {
						const root = fixture("provide", reading)
						const warnings: string[] = []
						const js = await bundle(
							name,
							root,
							{},
							{
								plugins: [
									compilers[name][1]({ cwd: root }) as never,
									new compilers[name][0].DefinePlugin({
										READ: JSON.stringify("literal")
									}) as never,
									new compilers[name][0].ProvidePlugin({
										Provided: ["buffer", "Buffer"]
									}) as never,
									collecting(warnings) as never
								]
							}
						)
						attest(warnings).equals([])
						attest(js.includes("~standard")).equals(false)
					})

					it("prunes where each names a literal or a global", async () => {
						const { js, warnings } = await defining(
							fixture("defineLiteral", reading),
							{
								READ: JSON.stringify("literal"),
								"process.env.TEXT": JSON.stringify("two words"),
								GLOBAL: "globalThis",
								COUNT: 1,
								NESTED: { ON: true }
							}
						)
						attest(warnings).equals([])
						attest(js.includes("~standard")).equals(false)
						attest(output(js)).equals("literal name must be a string\n")
					})
				})

				describe("a loader after the plugin's", () => {
					const rewriting = (rewrite: (code: string) => string) => ({
						module: {
							rules: [
								{
									test: /main\.js$/,
									loader: fromHere("rewriteLoader.ts"),
									options: { rewrite }
								}
							]
						}
					})

					it("builds whole where it adds a read, so the read throws", async () => {
						const root = fixture("loaderAfter", {
							"main.js": `import { User } from "./types.js"

console.log(String(User({ name: 5 })))
`
						})
						const warnings: string[] = []
						const js = await bundle(
							name,
							root,
							{},
							{
								...rewriting(code => `${code}console.log(User.expression)\n`),
								plugins: [
									compilers[name][1]({ cwd: root }) as never,
									collecting(warnings) as never
								]
							}
						)
						attest(
							warnings.some(warning =>
								warning.includes(
									"a loader after arktype's adds a read of expression to main.js"
								)
							)
						).equals(true)
						attest(
							spawnSync(process.execPath, {
								input: js,
								encoding: "utf8"
							}).stderr.includes("expression isn't precompiled")
						).equals(true)
					})

					it("prunes where it moves a read without adding one", async () => {
						const root = fixture("loaderAfterMoves", {
							"main.js": `import { User } from "./types.js"

console.log(User.expression, String(User({ name: 5 })))
`
						})
						const js = await bundle(
							name,
							root,
							{},
							rewriting(
								code =>
									`const read = () => User.expression\n${code.replace("User.expression", "read()")}`
							)
						)
						attest(js.includes("~standard")).equals(false)
						attest(output(js)).equals(
							"{ name: string } name must be a string\n"
						)
					})
				})

				describe("a module an inline loader request keeps from the plugin", () => {
					const identity = fromHere("identityLoader.ts")

					for (const prefix of ["-!", "!!", "!"]) {
						it(`reads what ${prefix} imports reads, as it can't write it`, async () => {
							const root = fixture(
								`inlineLoader-${
									prefix === "-!" ? "normal"
									: prefix === "!!" ? "all"
									: "own"
								}`,
								{
									"reader.js": `import { User } from "./types.js"

export const use = () => User.expression
`,
									"main.js": `import { use } from "${prefix}${identity}!./reader.js"

console.log(use())
`
								}
							)
							attest(output(await bundle(name, root))).equals(
								"{ name: string }\n"
							)
						})
					}

					it("refuses to read a file the plugin writes one way and not another", async () => {
						const root = fixture("inlineLoader-both", {
							"reader.js": `import { User } from "./types.js"

export const use = () => User.expression
`,
							"main.js": `import { use } from "./reader.js"
import { use as inlined } from "-!${identity}!./reader.js"

console.log(use(), inlined())
`
						})
						const warnings: string[] = []
						const js = await bundle(
							name,
							root,
							{},
							{
								plugins: [
									compilers[name][1]({ cwd: root }) as never,
									collecting(warnings) as never
								]
							}
						)
						attest(warnings.join("\n").includes("from two codes")).equals(true)
						// built one module at a time, what the inline request reads is missed
						attest(
							spawnSync(process.execPath, {
								input: js,
								encoding: "utf8"
							}).stderr.includes("expression isn't precompiled")
						).equals(true)
					})
				})

				describe("a package declaring no side effects", () => {
					const noSideEffects = {
						"package.json": JSON.stringify({
							type: "module",
							sideEffects: false
						})
					}

					const reads = (imported: string) => `${imported}

console.log(String(User({ name: 5 })))
`

					const shapes: Record<string, Record<string, string>> = {
						"imported directly": {
							"main.js": reads(`import { User } from "./types.js"`)
						},
						"through a named re-export": {
							"barrel.js": `export { User } from "./types.js"\n`,
							"main.js": reads(`import { User } from "./barrel.js"`)
						},
						"through a star re-export": {
							"barrel.js": `export * from "./types.js"\n`,
							"main.js": reads(`import { User } from "./barrel.js"`)
						},
						"through a star re-export and a rename": {
							"barrel.js": `export * from "./types.js"
export { User as Renamed } from "./types.js"
`,
							"main.js": reads(`import { Renamed as User } from "./barrel.js"`)
						},
						"through a chain of re-exports": {
							"outer.js": `export * from "./barrel.js"\n`,
							"barrel.js": `export { User } from "./types.js"\n`,
							"main.js": reads(`import { User } from "./outer.js"`)
						},
						"through a namespace": {
							"barrel.js": `export * from "./types.js"\n`,
							"main.js": `import * as all from "./barrel.js"

console.log(String(all.User({ name: 5 })))
`
						},
						"imported dynamically": {
							"barrel.js": `export { User } from "./types.js"\n`,
							"main.js": `import(/* webpackMode: "eager" */ "./barrel.js").then(({ User }) =>
	console.log(String(User({ name: 5 })))
)
`
						},
						"as a default export": {
							"types.js": `import { type } from "arktype"

export default type({ name: "string" })
`,
							"main.js": reads(`import User from "./types.js"`)
						},
						"under another name": {
							"types.js": `import { type } from "arktype"

const Local = type({ name: "string" })

export { Local as User }
`,
							"main.js": reads(`import { User } from "./types.js"`)
						}
					}

					for (const [shape, files] of Object.entries(shapes)) {
						for (const concatenateModules of [true, false]) {
							it(`keeps a validator ${shape}, ${concatenateModules ? "concatenating" : "not concatenating"} modules`, async () => {
								const root = fixture(
									`noSideEffects-${shape}-${concatenateModules}`.replace(
										/ /g,
										"-"
									),
									{ ...noSideEffects, ...files }
								)
								const js = await bundle(
									name,
									root,
									{},
									{ optimization: { concatenateModules } }
								)
								attest(output(js)).equals("name must be a string\n")
							})
						}
					}

					it("keeps both of two validators a module holds, when both are read", async () => {
						const root = fixture("noSideEffects-both", {
							...noSideEffects,
							"types.js": `import { type } from "arktype"

export const First = type({ name: "string" })
export const Second = type({ age: "number" })
`,
							"barrel.js": `export { First } from "./types.js"
export { Second } from "./types.js"
`,
							"main.js": `import { First, Second } from "./barrel.js"

console.log(String(First({ name: 5 })), String(Second({ age: "a" })))
`
						})
						attest(output(await bundle(name, root))).equals(
							"name must be a string age must be a number\n"
						)
					})

					it("leaves out a validator nothing reads of a module one is read from", async () => {
						const root = fixture("noSideEffects-other", {
							...noSideEffects,
							"types.js": `import { type } from "arktype"

export const User = type({ name: "string" })
export const Other = type({ uniqueOther: "string" })
`,
							"main.js": reads(`import { User } from "./types.js"`)
						})
						const js = await bundle(name, root)
						attest(js.includes("uniqueOther")).equals(false)
						attest(output(js)).equals("name must be a string\n")
					})

					it("builds no more than a raw build of a re-export nothing asks for", async () => {
						const root = fixture("noSideEffects-unasked", {
							...noSideEffects,
							"unasked.js": `import { type } from "arktype"

export const Unasked = type({ uniqueUnasked: "string" })
Unasked.expression
`,
							"types.js": `import { type } from "arktype"

export const User = type({ name: "string" })
export { Unasked } from "./unasked.js"
`,
							"main.js": reads(`import { User } from "./types.js"`)
						})
						const js = await bundle(name, root)
						attest(js.includes("uniqueUnasked")).equals(false)
						attest(output(js)).equals("name must be a string\n")
					})

					it("keeps a validator defined from one a deferred import holds", async () => {
						const root = fixture("noSideEffects-deferredImport", {
							...noSideEffects,
							"held.js": `import { type } from "arktype"

export const Held = type({ uniqueHeld: "string" })
`,
							"holder.js": `import { type } from "arktype"
import { Held } from "./held.js"

export const Holder = type({ held: Held })
export { User } from "./types.js"
`,
							"main.js": reads(`import { User } from "./holder.js"`)
						})
						const js = await bundle(name, root)
						attest(js.includes("uniqueHeld")).equals(false)
						attest(output(js)).equals("name must be a string\n")
					})

					it("answers a build its cache kept as one with no cache", async () => {
						const root = fixture("noSideEffects-cached", {
							...noSideEffects,
							"barrel.js": `export { User } from "./types.js"\n`,
							"main.js": reads(`import { User } from "./barrel.js"`)
						})
						const cache = cacheOf(root)
						const cold = await bundle(name, root, {}, cache)
						attest(output(cold)).equals("name must be a string\n")
						attest(cold).equals(await bundle(name, root))
						attest(await bundle(name, root, {}, cache)).equals(cold)
					})

					it("reads a member through a re-export", async () => {
						const root = fixture("noSideEffects-member", {
							...noSideEffects,
							"barrel.js": `export { User } from "./types.js"\n`,
							"main.js": `import { User } from "./barrel.js"

console.log(User.expression, String(User({ name: 5 })))
`
						})
						attest(output(await bundle(name, root))).equals(
							"{ name: string } name must be a string\n"
						)
					})
				})

				it("leaves out what no read needs, as an esbuild build does", async () => {
					const root = fixture("pruned", {
						"main.js": `import { type } from "arktype"
import { User } from "./types.js"

const out = User({ name: 5 })
console.log(out instanceof type.errors ? out.summary : out)
`
					})
					const pruned = await bundle(name, root)
					attest(output(pruned)).snap("name must be a string\n")
					attest(pruned.includes("~standard")).equals(false)
					const whole = await bundle(name, root, { prune: false })
					attest(output(whole)).equals(output(pruned))
					attest(whole.includes("~standard")).equals(true)
				})

				it("leaves an anonymous function its name, though a minifier inlines what sets it", async () => {
					const root = fixture("anonymous", {
						"main.js": `import { type } from "arktype"

const Even = type("number").narrow(n => n % 2 === 0)
console.log(Even(1).summary)
`
					})
					const js = await bundle(name, root)
					attest(output(js)).snap(
						"must be valid according to an anonymous predicate\n"
					)
				})

				it("reads the file an alias resolves an import to", async () => {
					const root = fixture("aliased", {
						"reader.js": readsStandard,
						"main.js": `import "@reader"\n`
					})
					const js = await bundle(
						name,
						root,
						{},
						{ resolve: { alias: { "@reader": join(root, "reader.js") } } }
					)
					attest(output(js)).snap("function\n")
				})

				it("reads the file a condition resolves an import to", async () => {
					const root = fixture("conditioned", {
						"package.json": JSON.stringify({
							imports: {
								"#reader": { custom: "./reader.js", default: "./plain.js" }
							}
						}),
						"reader.js": readsStandard,
						"plain.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`,
						"main.js": `import "#reader"\n`
					})
					const js = await bundle(
						name,
						root,
						{},
						{ resolve: { conditionNames: ["custom", "import", "..."] } }
					)
					attest(output(js)).snap("function\n")
				})

				it("reads a module as a loader ahead wrote it", async () => {
					const root = fixture("loaderAhead", {
						"reads.ts": `export default (source: string) => source + 'console.log(typeof User.assert)\\n'\n`,
						"main.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`
					})
					const js = await bundle(
						name,
						root,
						{},
						{
							module: {
								rules: [
									{
										test: /main\.js$/,
										enforce: "pre",
										loader: join(root, "reads.ts")
									}
								]
							}
						}
					)
					attest(output(js)).snap("\nfunction\n")
				})

				it("leaves whole what an import a later loader adds reaches", async () => {
					const root = fixture("loaderAfter", {
						"adds.ts": `export default (source: string) => source + 'import { User } from "./types.js"\\nconsole.log(typeof User["~standard"].validate)\\n'\n`,
						"uses.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`,
						"main.js": `import "./uses.js"\n`
					})
					const js = await bundle(
						name,
						root,
						{},
						{
							module: {
								rules: [{ test: /main\.js$/, loader: join(root, "adds.ts") }]
							}
						}
					)
					attest(output(js)).snap("\nfunction\n")
				})

				it("leaves whole what a generated entry imports", async () => {
					const root = fixture("generated", {
						"generates.ts": `export default () => 'import { User } from "./types.js"\\nconsole.log(typeof User["~standard"].validate)\\n'\n`,
						"uses.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`
					})
					const js = await bundle(
						name,
						root,
						{},
						{ entry: [`${join(root, "generates.ts")}!`, "./uses.js"] }
					)
					attest(output(js)).snap("function\n\n")
				})

				it("leaves whole what a loader's stylesheet module imports", async () => {
					const root = fixture("stylesheet", {
						"styles.css": "",
						"generates.ts": `export default () => 'import { User } from "./types.js"\\nconsole.log(typeof User["~standard"].validate)\\n'\n`,
						"main.js": `import "./styles.css"\nimport { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`
					})
					const js = await bundle(
						name,
						root,
						{},
						{
							module: {
								rules: [
									{
										test: /\.css$/,
										type: "javascript/auto",
										loader: join(root, "generates.ts")
									}
								]
							}
						}
					)
					attest(output(js)).snap("function\n\n")
				})

				it("builds each module on its own where a file builds from two codes", async () => {
					const root = fixture("twoCodes", {
						"suffix.ts": `export default (source: string) => source + 'export const suffixed = true\\n'\n`,
						"other.js": `export { suffixed } from "./types.js"\n`,
						"main.js": `import { User } from "./types.js"
import { suffixed } from "./other.js"

console.log(User({ name: "" }).name, suffixed)
`
					})
					const config = {
						module: {
							rules: [
								{
									test: /types\.js$/,
									issuer: /other\.js$/,
									enforce: "pre",
									loader: join(root, "suffix.ts")
								}
							]
						}
					}
					const stats = await built(
						(compilers[name][0] as typeof webpack)(
							configOf(name, root, {}, config)
						)
					)
					const { errors, warnings } = stats!.toJson({
						all: false,
						errors: true,
						warnings: true
					})
					attest(errors).equals([])
					attest(
						warnings?.map(({ message }) => message.includes("two codes"))
					).equals([true])
					const js = readFileSync(join(root, "out", name, "main.js"), "utf8")
					attest(output(js)).snap(" true\n")
					attest(js).equals(await bundle(name, root, { prune: false }, config))
				})

				const queried = {
					"validated.js": `import { type } from "arktype"

const check = () => true

export const V = type("string").narrow(check)
`,
					"main.js": `import { V as A } from "./validated.js?v=1"
import { V as B } from "./validated.js?v=2"

console.log(A("a"), B("b"))
`
				}

				const attestFails = async (build: Promise<string>, message: string) =>
					attest(
						await build.then(
							() => `it built, not failing with ${message}`,
							(e: Error) => (e.message.includes(message) ? message : e.message)
						)
					).equals(message)

				const queriedMessage =
					"can't be precompiled in a module another plugin writes"

				it("fails where a query builds a file that defines a validator again", async () => {
					const root = fixture("queried", queried)
					await attestFails(bundle(name, root), queriedMessage)
					await attestFails(
						bundle(name, root, { prune: false }),
						queriedMessage
					)
				})

				it("reads what a queried module reads", async () => {
					const root = fixture("queriedRead", {
						"reader.js": readsStandard,
						"uses.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`,
						"main.js": `import "./uses.js"\nimport "./reader.js?v=1"\n`
					})
					attest(output(await bundle(name, root))).snap("\nfunction\n")
				})

				it("reads past a query a rule builds as text", async () => {
					const root = fixture("queriedAsset", {
						...queried,
						"main.js": `import text from "./validated.js?raw"\n\nconsole.log(typeof text)\n`
					})
					const js = await bundle(
						name,
						root,
						{},
						{
							module: {
								rules: [{ resourceQuery: /raw/, type: "asset/source" }]
							}
						}
					)
					attest(output(js)).snap("string\n")
				})

				it("runs the config module first though a loader drops the import that loads it", async () => {
					const root = fixture("configured", {
						"elides.ts": `import { transformSync } from "esbuild"\n\nexport default (source: string) => transformSync(source, { loader: "ts", target: "esnext" }).code\n`,
						"ark-config.ts": `import { configure } from "arktype/config"\n\nconfigure({ exactOptionalPropertyTypes: false })\n`,
						"ark.ts": `import "./ark-config.ts"\n\nexport { type } from "arktype"\n`,
						// enough that its validators are written to a module of their own
						"main.ts": `import { type } from "./ark.ts"\n\nconst all = [${Array.from(
							{ length: 24 },
							(_, i) => `type({ "a${i}?": "string", b${i}: "number" })`
						).join(
							", "
						)}]\n\nconsole.log(all[0]({ a0: undefined, b0: 1 }).a0)\n`
					})
					const js = await bundle(
						name,
						root,
						{ config: "./ark-config.ts", preset: "smallest" },
						{
							entry: "./main.ts",
							resolve: { extensions: [".ts", ".js"] },
							module: {
								rules: [
									{
										test: /\.ts$/,
										exclude: /elides\.ts$/,
										loader: join(root, "elides.ts")
									}
								]
							}
						}
					)
					attest(output(js)).snap("undefined\n")
				})

				it("fails a build as a module it writes fails to precompile", async () => {
					const root = fixture("refused", {
						"main.js": `import { User } from "./types.js"\n\nconst read = User\nconsole.log(Object.keys(read))\n`
					})
					const message = await bundle(name, root).then(
						() => "it built",
						(e: Error) => e.message
					)
					attest(
						message.includes("Object.keys(read) reflects on a Type")
					).equals(true)
				})

				it("fails a build as a loader after it refuses what it wrote", async () => {
					const root = fixture("refusedAfter", {
						"refuses.ts": `export default (source: string) => {\n\tif (source.includes("~arktype")) throw new Error("refused its imports")\n\treturn source\n}\n`,
						"main.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`
					})
					const message = await bundle(
						name,
						root,
						{},
						{
							module: {
								rules: [
									{ test: /types\.js$/, loader: join(root, "refuses.ts") }
								]
							}
						}
					).then(
						() => "it built",
						(e: Error) => e.message
					)
					attest(message.includes("refused its imports")).equals(true)
				})

				it("runs the config module first though arktype is imported ahead of it", async () => {
					const root = fixture("configuredAfter", {
						"ark-config.js": `import { configure } from "arktype/config"\n\nconfigure({ exactOptionalPropertyTypes: false })\n`,
						"main.js": `import { type } from "arktype"\nimport "./ark-config.js"\n\nconst all = [${Array.from(
							{ length: 24 },
							(_, i) => `type({ "a${i}?": "string", b${i}: "number" })`
						).join(
							", "
						)}]\n\nconsole.log(all[0]({ a0: undefined, b0: 1 }).a0)\n`
					})
					const js = await bundle(name, root, {
						config: "./ark-config.js",
						preset: "smallest"
					})
					attest(output(js)).snap("undefined\n")
				})

				it("reads what a computed import reaches", async () => {
					const root = fixture("computed", {
						"types/a.js": types,
						"main.js": `const name = process.argv[2] ?? "a"
import(\`./types/\${name}.js\`).then(({ User }) =>
	console.log(typeof User.assert)
)
`
					})
					await splitBundle(name, root)
					attest(
						spawnSync(process.execPath, [join(root, "out", name, "main.cjs")], {
							encoding: "utf8"
						}).stdout
					).snap("function\n")
				})

				it("reads what a worker it builds reads", async () => {
					const root = fixture("worker", {
						"worker.js": `import { parentPort } from "node:worker_threads"
import { User } from "./types.js"

parentPort.postMessage(typeof User["~standard"].validate)
`,
						"main.js": `import { Worker } from "node:worker_threads"
import { User } from "./types.js"

console.log(User({ name: "" }).name)
new Worker(new URL("./worker.js", import.meta.url))
`
					})
					await splitBundle(name, root)
					const dir = join(root, "out", name)
					attest(
						readdirSync(dir).some(
							file =>
								file !== "main.cjs" &&
								readFileSync(join(dir, file), "utf8").includes("~standard")
						)
					).equals(true)
				})

				it("answers a build its cache kept as one with no cache, whichever file a read moved to", async () => {
					const root = fixture("cached", {
						"reader.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`,
						"main.js": `import "./reader.js"\n`
					})
					const cache = cacheOf(root)
					const uncached = () => bundle(name, root)
					const cold = await bundle(name, root, {}, cache)
					attest(cold.includes("~standard")).equals(false)
					attest(cold).equals(await uncached())
					attest(await bundle(name, root, {}, cache)).equals(cold)
					writeFileSync(join(root, "reader.js"), readsStandard)
					const edited = await bundle(name, root, {}, cache)
					attest(output(edited)).snap("function\n")
					attest(edited).equals(await uncached())
				})

				it("answers a build its cache kept as a loader ahead wrote it", async () => {
					const root = fixture("cachedAhead", {
						"reads.ts": `export default (source: string) => source + 'console.log(typeof User["~standard"].validate)\\n'\n`,
						"main.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`
					})
					const config = (cached: object) => ({
						...cached,
						module: {
							rules: [
								{
									test: /main\.js$/,
									enforce: "pre",
									loader: join(root, "reads.ts")
								}
							]
						}
					})
					const cache = cacheOf(root)
					const cold = await bundle(name, root, {}, config(cache))
					attest(output(cold)).snap("\nfunction\n")
					attest(await bundle(name, root, {}, config(cache))).equals(cold)
				})

				const calling = callingFrom("./types.js")
				const asserting = assertingFrom("./types.js")

				it("answers a build its cache kept as one with no cache, where an edit changes how the program fails", async () => {
					const root = fixture("cachedFailure", { "main.js": calling })
					const cache = cacheOf(root)
					await bundle(name, root, { errors: "none" }, cache)
					writeFileSync(join(root, "main.js"), asserting)
					const edited = await bundle(name, root, { errors: "none" }, cache)
					attest(output(edited)).snap("is invalid\n")
					attest(edited).equals(await bundle(name, root, { errors: "none" }))
				})

				it("reads again as a watch build's file changes", async () => {
					const root = fixture("watched", {
						"reader.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`,
						"main.js": `import "./reader.js"\n`
					})
					const compiler = (compilers[name][0] as typeof webpack)(
						configOf(name, root, {})
					)
					const outputs: string[] = []
					await new Promise<void>((resolve, reject) => {
						const watching = compiler.watch({}, (error, stats) => {
							if (error) return reject(error)
							if (stats?.hasErrors())
								return reject(new Error(stats.toString("errors-only")))
							outputs.push(
								output(readFileSync(join(root, "out", name, "main.js"), "utf8"))
							)
							if (outputs.length === 1)
								writeFileSync(join(root, "reader.js"), readsStandard)
							else watching!.close(() => resolve())
						})
					})
					attest(outputs).equals(["\n", "function\n"])
				})

				it("writes again as a watch build's edit changes how the program fails", async () => {
					const root = fixture("watchedFailure", { "main.js": calling })
					const compiler = (compilers[name][0] as typeof webpack)(
						configOf(name, root, { errors: "none" })
					)
					const bundles: string[] = []
					await new Promise<void>((resolve, reject) => {
						const watching = compiler.watch({}, (error, stats) => {
							if (error) return reject(error)
							if (stats?.hasErrors())
								return reject(new Error(stats.toString("errors-only")))
							bundles.push(
								readFileSync(join(root, "out", name, "main.js"), "utf8")
							)
							if (bundles.length === 1)
								writeFileSync(join(root, "main.js"), asserting)
							else watching!.close(() => resolve())
						})
					})
					attest(output(bundles[1])).snap("is invalid\n")
					attest(bundles[1]).equals(
						await bundle(name, root, { errors: "none" })
					)
				})

				it("prunes each of a multi-compiler's builds by its own reads", async () => {
					const root = fixture("multi", {
						"reads.js": readsStandard,
						"calls.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`
					})
					const configOfEntry = (entry: string) => ({
						...configOf(name, root, {}),
						name: entry,
						entry: `./${entry}.js`,
						output: {
							path: join(root, "out", name),
							filename: `${entry}.js`
						}
					})
					await new Promise<void>((resolve, reject) => {
						const compiler = (compilers[name][0] as unknown as typeof webpack)([
							configOfEntry("reads"),
							configOfEntry("calls")
						] as never)
						compiler.run((error, stats) =>
							compiler.close(() =>
								error ? reject(error)
								: stats?.hasErrors() ?
									reject(new Error(stats.toString("errors-only")))
								:	resolve()
							)
						)
					})
					const emitted = (entry: string) =>
						readFileSync(join(root, "out", name, `${entry}.js`), "utf8")
					attest(output(emitted("reads"))).snap("function\n")
					attest(emitted("calls").includes("~standard")).equals(false)
				})
			})
		}

		// Rspack's child compilations can't load unplugin's virtual modules
		// Rspack has no such hook, as it only adds a module as it makes them
		it("fails where a webpack plugin builds a module once it read them", async () => {
			const root = writeFixture(
				{
					"types.js": types,
					"late.js": readsStandard,
					"main.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`
				},
				fromHere("temp", "prunedWebpack", "late")
			)
			const late = {
				apply: (compiler: webpack.Compiler) =>
					compiler.hooks.thisCompilation.tap("late", compilation =>
						compilation.hooks.finishModules.tapAsync("late", (_, done) =>
							compilation.addInclude(
								root,
								compiler.webpack.EntryPlugin.createDependency("./late.js", {
									name: "main"
								}),
								{ name: "main" },
								error => done(error ?? undefined)
							)
						)
					)
			}
			const failure = await bundle(
				"webpack",
				root,
				{},
				{ plugins: [precompile.webpack({ cwd: root }) as never, late as never] }
			).then(
				() => "it built",
				(e: Error) => e.message
			)
			attest(
				failure.includes(
					writeUnseenMessage("a plugin built late.js once it had read them")
				)
			).equals(true)
		})

		it("builds a webpack child compilation's modules whole", async () => {
			const root = writeFixture(
				{
					"types.js": types,
					"child.js": `import { User } from "./types.js"\n\nexport const validate = User["~standard"].validate\n`,
					"main.js": `import { User } from "./types.js"\n\nconsole.log(User({ name: "" }).name)\n`
				},
				fromHere("temp", "prunedWebpack", "child")
			)
			const child = {
				apply: (compiler: webpack.Compiler) =>
					compiler.hooks.make.tapAsync("child", (compilation, done) =>
						compilation
							.createChildCompiler("child", { filename: "child.js" }, [
								new compiler.webpack.EntryPlugin(root, "./child.js", {
									name: "child"
								})
							])
							.runAsChild(error => done(error ?? undefined))
					)
			}
			const js = await bundle(
				"webpack",
				root,
				{},
				{
					plugins: [precompile.webpack({ cwd: root }) as never, child as never]
				}
			)
			attest(js.includes("~standard")).equals(false)
			attest(
				readFileSync(join(root, "out", "webpack", "child.js"), "utf8").includes(
					"~standard"
				)
			).equals(true)
		})

		it("builds whole where a define's value is written at build time", async () => {
			const root = writeFixture(
				{
					"types.js": types,
					"main.js": `import { User } from "./types.js"

console.log(READ, String(User({ name: 5 })))
`
				},
				fromHere("temp", "prunedWebpack", "webpack", "runtimeValue")
			)
			const warnings: string[] = []
			await bundle(
				"webpack",
				root,
				{},
				{
					plugins: [
						precompile.webpack({ cwd: root }) as never,
						new webpack.DefinePlugin({
							READ: webpack.DefinePlugin.runtimeValue(() => "User.expression")
						}) as never,
						collecting(warnings) as never
					]
				}
			)
			attest(
				warnings.some(warning =>
					warning.includes("define writes READ at build time")
				)
			).equals(true)
		})

		it("fails a build webpack leaves an export it reads unbuilt in", async () => {
			const root = writeFixture(
				{
					"package.json": JSON.stringify({
						type: "module",
						sideEffects: false
					}),
					"types.js": types,
					"main.js": `import { User } from "./types.js"

console.log(String(User({ name: 5 })))
`
				},
				fromHere("temp", "prunedWebpack", "webpack", "forgets")
			)
			// as a webpack that came to defer them otherwise might
			const forgets = {
				apply: (compiler: webpack.Compiler) =>
					compiler.hooks.thisCompilation.tap("forgets", compilation =>
						compilation.hooks.rebuildModule.tap("forgets", module =>
							(
								compilation as unknown as {
									_lazyBarrels: { _modules: WeakMap<object, unknown> }
								}
							)._lazyBarrels._modules.delete(module)
						)
					)
			}
			const error: Error = await bundle(
				"webpack",
				root,
				{},
				{
					plugins: [
						precompile.webpack({ cwd: root }) as never,
						forgets as never
					]
				}
			).then(
				() => new Error("built"),
				e => e
			)
			attest(
				error.message.includes(writeUnbuiltReadMessage("types.js", "User"))
			).equals(true)
		})
	})

	describe("programAsBuilt", () => {
		const moduleOf = (
			id: string | undefined,
			source?: string | null,
			...imports: BuiltImport[]
		): BuiltModule => ({
			id,
			source,
			transformed: true,
			mappings: undefined,
			imports
		})

		const importOf = (
			specifier: string | undefined,
			target: BuiltModule
		): BuiltImport => ({ specifier, isDynamic: false, target })

		const readOf = (...entries: BuiltModule[]) =>
			programAsBuilt("1", entries, {
				isTransformed: id => !id.includes("node_modules"),
				cwd: "/app"
			})

		it("refuses a file built from two codes", () => {
			attest(readOf(moduleOf("/app/a.ts", null))).equals(
				"it built a.ts from two codes"
			)
			attest(
				readOf(moduleOf("/app/a.ts", ""), moduleOf("/app/a.ts", "export {}"))
			).equals("it built a.ts from two codes")
		})

		it("refuses a specifier a module imports as two files", () => {
			const source = `import "./c.ts"`
			attest(
				readOf(
					moduleOf(
						"/app/a.ts",
						source,
						importOf("./c.ts", moduleOf("/app/one/c.ts", "")),
						importOf("./c.ts", moduleOf("/app/two/c.ts", ""))
					)
				)
			).equals(`a.ts imports "./c.ts" as both one/c.ts and two/c.ts`)
		})

		it("refuses a module it can't read or parse", () => {
			attest(readOf(moduleOf("/app/a.ts"))).equals("a.ts can't be read")
			attest(readOf(moduleOf("/app/a.ts", "const"))).equals(
				"a.ts:1:6 can't be parsed"
			)
		})

		it("exposes what a generated module, or an import its text doesn't name, reaches", () => {
			const read = readOf(
				moduleOf(
					undefined,
					undefined,
					importOf("./page.ts", moduleOf("/app/page.ts", ""))
				),
				moduleOf(
					"/app/main.ts",
					`import "./named.ts"`,
					importOf("./named.ts", moduleOf("/app/named.ts", "")),
					importOf("./added.ts", moduleOf("/app/added.ts", "")),
					importOf(undefined, moduleOf("/app/unnamed.ts", ""))
				)
			)
			attest(typeof read !== "string" && read.exposed).equals([
				"/app/added.ts",
				"/app/page.ts",
				"/app/unnamed.ts"
			])
		})

		it("writes no program as one chunk where one imports another dynamically", () => {
			const read = readOf(
				moduleOf("/app/main.ts", `import("./lazy.ts")`, {
					specifier: "./lazy.ts",
					isDynamic: true,
					target: moduleOf("/app/lazy.ts", "")
				})
			)
			if (typeof read === "string") throw new Error(read)
			attest(read.dynamicImports).equals(["/app/lazy.ts"])
			attest(read.isOneChunk).equals(false)
		})

		it("reads what a dependency imports, not the dependency", () => {
			const read = readOf(
				moduleOf(
					"/app/main.ts",
					`import "dep"`,
					importOf(
						"dep",
						moduleOf(
							"/app/node_modules/dep/index.js",
							undefined,
							importOf("../../held.ts", moduleOf("/app/held.ts", ""))
						)
					)
				)
			)
			if (typeof read === "string") throw new Error(read)
			attest(Object.keys(read.modules)).equals(["/app/held.ts", "/app/main.ts"])
			attest(read.exposed).equals(["/app/held.ts"])
			attest(read.isOneChunk).equals(false)
		})

		it("answers alike however the bundler found its modules", () => {
			const reading = (reversed: boolean) => {
				const imports = [
					importOf("./a.ts", moduleOf("/app/a.ts", "")),
					importOf("./b.ts", moduleOf("/app/b.ts", ""))
				]
				return readOf(
					moduleOf(
						"/app/main.ts",
						`import "./a.ts"\nimport "./b.ts"`,
						...(reversed ? imports.reverse() : imports)
					)
				)
			}
			attest(JSON.stringify(reading(true))).equals(
				JSON.stringify(reading(false))
			)
		})
	})

	describe("hosts that can't prune", () => {
		// prune: true as ark.json sets it, read from beside package.json
		const settled = writeFixture(
			{
				"package.json": "{}",
				"ark.json": JSON.stringify({ precompile: { prune: true } })
			},
			fromHere("temp", "prunedSettings")
		)

		const refusals = (refuse: (opts: PrecompileUnpluginOptions) => unknown) =>
			[{ prune: true }, { cwd: settled }].map(opts => {
				try {
					refuse(opts)
				} catch (e) {
					return (e as Error).message
				}
			})

		it("refuses it with Node's driver", () => {
			attest(refusals(register)).equals([
				writePruneHostMessage("Node"),
				writePruneHostMessage("Node")
			])
		})

		it("refuses it with Bun's plugin", () => {
			attest(refusals(bunPlugin)).equals([
				writePruneHostMessage("Bun"),
				writePruneHostMessage("Bun")
			])
		})

		it("refuses it with Turbopack's loader", () => {
			attest(
				refusals(opts =>
					turbopack.call(
						{ getOptions: () => opts, resourcePath: "a.ts" } as never,
						""
					)
				)
			).equals([
				writePruneHostMessage("a loader outside `next build`"),
				writePruneHostMessage("a loader outside `next build`")
			])
		})

		it("refuses it with arktype-precompile --emit", () => {
			attest(refusals(emitPrecompiled)).equals([
				writePruneHostMessage("arktype-precompile"),
				writePruneHostMessage("arktype-precompile")
			])
			for (const { stderr, status } of [
				runCli(fromHere(), "--emit", "--prune"),
				runCli(settled, "--emit")
			]) {
				attest(status).equals(2)
				attest(
					stderr.startsWith(writePruneHostMessage("arktype-precompile"))
				).equals(true)
			}
		})

		it("lets arktype-precompile --check a build that prunes", () => {
			for (const { stdout, status } of [
				runCli(settled, "--check", "--prune"),
				runCli(settled, "--check")
			]) {
				attest([status, stdout]).equals([
					0,
					"0 sites in 0 files: 0 accepted (100.0%)\n"
				])
			}
		})
	})
})
