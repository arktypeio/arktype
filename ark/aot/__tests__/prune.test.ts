import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { Precompiler, type PrecompileOptions } from "@ark/aot"
import { linkBundle } from "@ark/aot/internal/link.ts"
import { emitPrecompiled } from "@ark/aot/internal/emit.ts"
import {
	addLoaded,
	scanProgram,
	unseenProblemOf,
	writeKeptMembersMessage,
	writeUnseenMessage,
	type LoadedSources
} from "@ark/aot/internal/scan.ts"
import {
	pruneBeforePluginMessage,
	writePruneHostMessage
} from "@ark/aot/internal/settings.ts"
import { precompile as bunPlugin } from "@ark/aot/bun"
import { register } from "@ark/aot/node"
import turbopack from "@ark/aot/turbopack"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { rspack } from "@rspack/core"
import { build, context, type BuildOptions, type Plugin } from "esbuild"
import {
	build as viteBuild,
	defaultClientConditions,
	type InlineConfig,
	type Plugin as VitePlugin,
	type Rolldown
} from "vite"
import webpack, { type Stats } from "webpack"
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, posix, relative, win32 } from "node:path"
import { stripVTControlCharacters } from "node:util"
import {
	memoryHost,
	normalized,
	run,
	runBundle,
	runCli,
	writeFixture
} from "./utils.ts"

const types = `import { type } from "arktype"

export const User = type({ name: "string" })
`

// the members a production build for size leaves out of the program's
// validators, why it leaves none where it can't, or the errors failing its
// build
const droppedFrom = async (
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
	const usage = precompiler.scan(scanned)
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

		it("traverse() and from()", async () => {
			for (const read of ["User.traverse({})", "User.from({})"])
				attest(await droppedReading(read)).snap(["assert", "meta", "~standard"])
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

		it("an argument", async () => {
			attest(await droppedReading(`console.log(User)`)).snap(
				"main.ts:3:13 passes User to a function, which may read any member"
			)
		})

		it("a property", async () => {
			attest(await droppedReading(`export const types = { User }`)).snap(
				"main.ts:3:24 reads User other than to call it or read a member it knows"
			)
		})

		it("a member it doesn't know", async () => {
			attest(await droppedReading(`User.bind(null)`)).snap(
				"main.ts:3:1 reads User.bind, a member it doesn't know"
			)
		})

		it("a binding other than a const", async () => {
			attest(
				await droppedFrom({
					"/main.ts": `import { type } from "arktype"\n\nlet User = type({ name: "string" })\n\nUser({})`
				})
			).snap(
				'main.ts:3:12 holds type({ name: "string" }) in User, which isn\'t a const'
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
					"/main.ts": `import { type } from "arktype"\n\nconsole.log(type({ name: "string" }))`
				})
			).snap(
				'main.ts:3:13 passes type({ name: "string" }) to a function, which may read any member'
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

		it("an import whose function a factory reads", async () => {
			attest(
				await droppedFrom(
					{
						"/types.ts": `import { type } from "arktype"\n\nexport const Trimmed = type("string").pipe(s => s.trim())`,
						"/admin.ts": `import { type } from "arktype"\nimport { Trimmed } from "./types.ts"\n\nexport const Admin = type({ name: Trimmed })`,
						"/main.ts": `import { Admin } from "./admin.ts"\n\nAdmin({})`
					},
					{ preset: undefined, creationChecks: "none" }
				)
			).snap(
				"admin.ts:4:35 reads Trimmed other than to call it or read a member it knows"
			)
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
				"view.tsx:3:22 reads User other than to call it or read a member it knows"
			)
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

		it("a computed require", async () => {
			attest(
				await droppedReading(`const path = "./types.ts"\nrequire(path)`)
			).snap("main.ts:4:1 calls require() by a computed specifier")
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

		it("reads the program a dependency imports, as Nuxt's runtime imports its pages", async () => {
			attest(
				await droppedThrough(
					`export const routes = [() => import("../../page.ts")]\n`,
					{
						"/page.ts": `import { User } from "./types.ts"\n\nUser.assert({})\n`
					}
				)
			).equals(["meta", "~standard", "methods"])
		})

		it("keeps what a dependency may read of a module it imports", async () => {
			attest(await droppedThrough(`import "../../types.ts"\n`)).snap(
				"types.ts exports User, which a dependency may read"
			)
		})

		it("reads past what a dependency loads unnamed", async () => {
			attest(
				await droppedThrough(
					`import.meta.glob("./*.js")\nrequire(process.env.PLUGIN)\nimport "../../page.ts"\n`,
					{
						"/page.ts": `import { User } from "./types.ts"\n\nUser.assert({})\n`
					}
				)
			).equals(["meta", "~standard", "methods"])
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
				writeUnseenMessage("it built main.ts from other code than it read")
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

		const warningsOf = async (
			opts: PrecompileUnpluginOptions,
			{ plugins = [] }: BuildOptions = {}
		) =>
			(
				await build({
					entryPoints: [join(root, "main.ts")],
					absWorkingDir: root,
					bundle: true,
					write: false,
					format: "esm",
					conditions,
					logLevel: "silent",
					plugins: [precompile.esbuild({ conditions, ...opts }), ...plugins]
				})
			).warnings

		it("leaves out of a production build for size what no read needs", async () => {
			const pruned = await bundle()
			const whole = await bundle({ prune: false })
			attest(run(pruned)).snap("name must be a string\n")
			attest(run(whole)).equals(run(pruned))
			attest(whole.includes("~standard")).equals(true)
			attest(pruned.includes("~standard")).equals(false)
		})

		it("leaves out of a default production build what no read needs", async () => {
			const pruned = await bundle({ preset: undefined })
			attest(run(pruned)).snap("name must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
			attest(
				(await bundle({ preset: undefined, prune: false })).includes(
					"~standard"
				)
			).equals(true)
		})

		it("drops what reads what no validator's issues hold", async () => {
			const files = writeFixture(
				{
					"user.ts": `import { type } from "arktype"\n\nconsole.log(type({ name: "string" })({ name: 5 }).toString())\n`,
					"tagged.ts": `import { type } from "arktype"\n\nconsole.log(type({ tags: "string[]" })({ tags: ["a", 5] }).toString())\n`,
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
`
				},
				fromHere("temp", "prunedIssues")
			)
			const bundleOf = (entry: string) =>
				bundle({ preset: undefined }, { entryPoints: [join(files, entry)] })
			const user = await bundleOf("user.ts")
			attest(run(user)).snap("name must be a string\n")
			attest(user.includes("`[${")).equals(false)
			attest(user.includes(".text?.(")).equals(false)
			const tagged = await bundleOf("tagged.ts")
			attest(run(tagged)).snap("tags[1] must be a string\n")
			attest(tagged.includes("`[${")).equals(true)
			attest(tagged.includes(".text?.(")).equals(false)
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

		it("keeps a build other than for production whole", async () => {
			const development = { conditions: ["ark-ts"] }
			attest(await bundle({}, development)).equals(
				await bundle({ prune: false }, development)
			)
		})

		it("prunes a build other than for production with prune: true", async () => {
			const development = { conditions: ["ark-ts"] }
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
		})

		it("warns where it keeps each member members leaves to it", async () => {
			const main = join(root, "main.ts")
			const source = readFileSync(main, "utf8")
			writeFileSync(main, `${source}console.log({ User })\n`)
			const textsOf = async (opts: PrecompileUnpluginOptions) =>
				(await warningsOf(opts)).map(warning => warning.text)
			const members = Object.fromEntries(
				everyMember.map(member => [member, true])
			)
			try {
				attest(await textsOf({ preset: undefined })).snap([
					"prune: keeping assert, meta, ~standard and methods, because main.ts:6:15 reads User other than to call it or read a member it knows. Set assert, meta, ~standard and methods in members, each false where no code reads it, to build without this warning."
				])
				attest(await textsOf({ members: { assert: true } })).snap([
					"prune: keeping meta, ~standard and methods, because main.ts:6:15 reads User other than to call it or read a member it knows. Set meta, ~standard and methods in members, each false where no code reads it, to build without this warning."
				])
				attest(await textsOf({ members })).equals([])
				// setting what it kept changes nothing it writes
				attest(await bundle({ members })).equals(await bundle())
			} finally {
				writeFileSync(main, source)
			}
		})

		it("fails prune: true where a plugin after it may load a module", async () => {
			const plugins = [{ name: "after", setup: () => {} }]
			const error = await bundle({ prune: true }, { plugins }).then(
				() => undefined,
				(e: Error) => e
			)
			attest(error?.message.includes(pruneBeforePluginMessage)).equals(true)
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

		it("reads an entry from stdin", async () => {
			const js = await bundle(
				{},
				{
					stdin: {
						contents: readFileSync(join(root, "main.ts"), "utf8"),
						resolveDir: root,
						loader: "ts"
					}
				}
			)
			attest(run(js)).snap("name must be a string\n")
			attest(js.includes("~standard")).equals(false)
		})

		it("reads an entry named from its working directory without ./", async () => {
			for (const entryPoints of [
				["main.ts"],
				[{ in: "main.ts", out: "main" }],
				{ main: "main.ts" }
			]) {
				const js = await bundle(
					{},
					{ entryPoints, absWorkingDir: root, outdir: "out" }
				)
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

export const A = /* @__PURE__ */ $ark_create(/* @__PURE__ */ $ark_runtime.props({ name: $ark_runtime.string }))

import * as $ark_runtime from "arktype/runtime"`)
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

const aAllows = /* @__PURE__ */ create(/* @__PURE__ */ runtime.props({ name: runtime.string }))

export { aAllows }

import { create } from "~arktype/create"`)
				attest(normalized(linked.sites["/main.ts"].code))
					.snap(`import { aAllows as $ark_aAllows } from "~arktype/a-#0"
import { create as $ark_create } from "~arktype/create"

export { $ark_aAllows as A }
import { bAllows as $ark_bAllows } from "~arktype/b-#1"

export const B = /* @__PURE__ */ $ark_create(/* @__PURE__ */ $ark_runtime.props({ a: /* @__PURE__ */ $ark_runtime.allowsOf($ark_aAllows) }))

import * as $ark_runtime from "arktype/runtime"`)
			})

			it("counts where validators don't", () => {
				const linked = linkedWith(code, false)
				attest(linked.unexposed).equals(1)
				attest(linked.sites["/main.ts"].code.includes("export const A")).equals(
					true
				)
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
				onwarn
			}: {
				plugins?: VitePlugin[]
				following?: VitePlugin[]
				lib?: boolean
				onwarn?: (warning: { message: string; plugin?: string }) => void
			} = {}
		) => {
			const { NODE_ENV } = process.env
			process.env.NODE_ENV = "production"
			try {
				const config: InlineConfig = {
					root,
					configFile: false,
					logLevel: "silent",
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

		it("reads a module another plugin compiles, like a Svelte component", async () => {
			const pruned = await importing(
				'import read from "./Form.svelte"\nconsole.log(read)',
				() =>
					bundle(
						{},
						{ plugins: [framework('User.assert({ name: "Ada" }).name')] }
					)
			)
			attest(run(pruned)).snap("Ada\nname must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
		})

		it("reads a virtual module another plugin writes", async () => {
			const pruned = await importing(
				'import read from "$app/routes"\nconsole.log(read)',
				() =>
					bundle(
						{},
						{ plugins: [framework('User.assert({ name: "Ada" }).name')] }
					)
			)
			attest(run(pruned)).snap("Ada\nname must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
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
				"node_modules/fw/index.js imports types.ts"
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

		it("resolves a relative import as a require, which Rollup's CommonJS plugin answers without loading it", async () => {
			// loads a module of the program an import resolves to, as
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
			const pruned = await bundle({}, { plugins: [loading] })
			attest(run(pruned)).snap("name must be a string\n")
			attest(pruned.includes("~standard")).equals(false)
		})

		it("reads a module as a plugin ahead of it transformed it", async () => {
			const asserting: VitePlugin = {
				name: "asserting",
				enforce: "pre",
				transform: (code, id) =>
					id.endsWith("/main.ts") ?
						code.replace("User({ name: 5 })", "User.assert({ name: 5 })")
					:	undefined
			}
			const pruned = await bundle({}, { plugins: [asserting] })
			const { stderr } = runBundle(pruned)
			attest(stderr.includes("[TraversalError]: name must be a string")).equals(
				true
			)
			attest(pruned.includes("~standard")).equals(false)
		})
	})

	describe("webpack and Rspack", () => {
		const root = writeFixture(
			{
				"types.js": types,
				"main.js": `import { type } from "arktype"
import { User } from "./types.js"

const out = User({ name: 5 })
console.log(out instanceof type.errors ? out.summary : out)
`
			},
			fromHere("temp", "prunedWebpack")
		)

		const compilers = {
			webpack: [webpack, precompile.webpack],
			Rspack: [rspack, precompile.rspack]
		} as const

		// a production build's bundle, as the compiler writes it
		const bundle = async (
			name: keyof typeof compilers,
			opts: PrecompileUnpluginOptions
		) => {
			const [compile, plugin] = compilers[name]
			const outDir = join(root, "out", name)
			const compiler = (compile as typeof webpack)({
				mode: "production",
				context: root,
				entry: "./main.js",
				target: "node",
				output: { path: outDir, filename: "main.js" },
				plugins: [plugin(opts) as never]
			})
			const stats = await new Promise<Stats | undefined>((resolve, reject) =>
				compiler.run((error, stats) =>
					compiler.close(() => (error ? reject(error) : resolve(stats)))
				)
			)
			if (stats?.hasErrors()) throw new Error(stats.toString("errors-only"))
			return readFileSync(join(outDir, "main.js"), "utf8")
		}

		for (const name of Object.keys(compilers) as (keyof typeof compilers)[]) {
			it(`builds each validator of a ${name} production build whole`, async () => {
				const built = await bundle(name, {})
				attest(
					spawnSync(process.execPath, { input: built, encoding: "utf8" }).stdout
				).snap("name must be a string\n")
				attest(built.includes("~standard")).equals(true)
				attest(built).equals(await bundle(name, { prune: false }))
			})
		}
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
				writePruneHostMessage("Turbopack"),
				writePruneHostMessage("Turbopack")
			])
		})

		it("refuses it with webpack and Rspack", () => {
			const compile = (opts: PrecompileUnpluginOptions) => ({
				mode: "production" as const,
				context: settled,
				entry: "./main.js",
				plugins: [precompile.webpack(opts) as never]
			})
			attest(refusals(opts => webpack(compile(opts)))).equals([
				writePruneHostMessage("webpack"),
				writePruneHostMessage("webpack")
			])
			attest(
				refusals(opts =>
					rspack({
						...compile(opts),
						plugins: [precompile.rspack(opts) as never]
					})
				)
			).equals([
				writePruneHostMessage("rspack"),
				writePruneHostMessage("rspack")
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
