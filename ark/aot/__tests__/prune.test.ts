import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { Precompiler, type PrecompileOptions } from "@ark/aot"
import { linkBundle } from "@ark/aot/internal/link.ts"
import { emitPrecompiled } from "@ark/aot/internal/emit.ts"
import { scanProgram, writeUnseenMessage } from "@ark/aot/internal/scan.ts"
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
import { join, posix } from "node:path"
import { memoryHost, normalized, runCli, writeFixture } from "./utils.ts"

const types = `import { type } from "arktype"

export const User = type({ name: "string" })
`

// the members a production build for size leaves out of the program's
// validators, "open" where its scan can't read every module, or the errors
// failing its build
const droppedFrom = async (
	files: Record<string, string>,
	opts?: PrecompileOptions
) => {
	const precompiler = new Precompiler(memoryHost(files), {
		preset: "smallest",
		...opts
	})
	const scanned = await scanProgram("test", [{ id: "/main.ts" }], {
		resolve: async (specifier, importer) => {
			if (!specifier.startsWith(".")) return null
			const id = posix.join(posix.dirname(importer), specifier)
			return id in files ? id : undefined
		},
		readFile: id => files[id],
		isTransformed: () => true
	})
	if (!scanned) return "open"
	// a module that fails its build would hide what the scan read
	for (const id in scanned.modules) {
		const errors = precompiler
			.precompile(files[id], id)
			.diagnostics.filter(diagnostic => diagnostic.severity === "error")
		if (errors.length) return errors.map(error => error.message)
	}
	return precompiler.scan(scanned).dropped
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
		const keepsAll = async (read: string) =>
			attest(await droppedReading(read)).equals([])

		it("an entry's export", async () => {
			await keepsAll(`export { User }`)
		})

		it("an argument", async () => {
			await keepsAll(`console.log(User)`)
		})

		it("a property", async () => {
			await keepsAll(`export const types = { User }`)
		})

		it("a member it doesn't know", async () => {
			await keepsAll(`User.bind(null)`)
		})

		it("a binding other than a const", async () => {
			attest(
				await droppedFrom({
					"/main.ts": `import { type } from "arktype"\n\nlet User = type({ name: "string" })\n\nUser({})`
				})
			).equals([])
		})

		it("a namespace read whole", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/main.ts": `import * as t from "./types.ts"\n\nconsole.log(t)`
				})
			).equals([])
		})

		it("export * as", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/barrel.ts": `export * as t from "./types.ts"`,
					"/main.ts": `import { t } from "./barrel.ts"\n\nt.User({})`
				})
			).equals([])
		})

		it("a dynamic import", async () => {
			await keepsAll(`await import("./types.ts")`)
		})

		it("require", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/main.ts": `const { User } = require("./types.ts")\n\nUser({})`
				})
			).equals([])
		})

		it("eval", async () => {
			await keepsAll(`User({})\neval("User.assert({})")`)
		})

		it("a validator created outside a const", async () => {
			attest(
				await droppedFrom({
					"/main.ts": `import { type } from "arktype"\n\nconsole.log(type({ name: "string" }))`
				})
			).equals([])
		})

		it("an import a factory checks", async () => {
			attest(
				await droppedFrom(composed, {
					preset: undefined,
					creationChecks: "types"
				})
			).equals([])
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
			).equals([])
		})

		it("a Scope", async () => {
			attest(
				await droppedFrom({
					"/main.ts": `import { scope } from "arktype"\n\nconst $ = scope({ user: { name: "string" } }).export()\n\n$.user({})`
				})
			).equals([])
		})

		it("JSX", async () => {
			attest(
				await droppedFrom({
					"/types.ts": types,
					"/main.ts": `import "./view.tsx"`,
					"/view.tsx": `import { User } from "./types.ts"\n\nexport const view = <User />`
				})
			).equals([])
		})
	})

	describe("programs it can't read", () => {
		it("a specifier it can't resolve", async () => {
			attest(await droppedReading(`import "./unresolved.ts"\nUser({})`)).equals(
				"open"
			)
		})

		it("a module of another language", async () => {
			attest(
				await droppedReading(`import "./view.vue"\nUser({})`, {
					"/view.vue": "<script setup>User.assert({})</script>"
				})
			).equals("open")
		})

		it("a computed dynamic import", async () => {
			attest(
				await droppedReading(`const path = "./types.ts"\nawait import(path)`)
			).equals("open")
		})

		it("a computed require", async () => {
			attest(
				await droppedReading(`const path = "./types.ts"\nrequire(path)`)
			).equals("open")
		})

		it("require read as a value", async () => {
			attest(await droppedReading(`const load = require`)).equals("open")
		})

		it("import.meta.glob", async () => {
			attest(
				await droppedReading(`import.meta.glob("./*.ts")\nUser({})`)
			).equals("open")
		})

		it("but import.meta.env", async () => {
			attest(await droppedReading(`if (import.meta.env.PROD) User({})`)).equals(
				everyMember
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

		const run = (js: string) =>
			spawnSync(process.execPath, ["--input-type=module"], {
				input: js,
				encoding: "utf8"
			}).stdout

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
			const main = join(root, "main.ts")
			const loader: Plugin = {
				name: "loader",
				setup: build =>
					build.onLoad({ filter: /\/main\.ts$/ }, () => ({
						contents: `import { User } from "./types.ts"\n\nconsole.log(User.assert({ name: "Ada" }))\n`,
						loader: "ts",
						resolveDir: root
					}))
			}
			const result = await build({
				entryPoints: [main],
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
			).equals([writeUnseenMessage(`another plugin loaded ${main}`)])
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
			let resolutions = 0
			// resolves reader.ts as the scan reads it, then as asserter.ts
			const swap: Plugin = {
				name: "swap",
				setup: build =>
					build.onResolve({ filter: /reader\.ts$/ }, () => ({
						path: join(files, resolutions++ ? "asserter.ts" : "reader.ts")
					}))
			}
			const result = await build({
				entryPoints: [join(files, "main.ts")],
				bundle: true,
				write: false,
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [swap, precompile.esbuild({ preset: "smallest", conditions })]
			}).catch((e: { errors: { text: string }[] }) => e)
			attest(
				"errors" in result && result.errors.map(error => error.text)
			).equals([
				writeUnseenMessage(
					`${join(files, "asserter.ts")} imports ${join(files, "types.ts")}`
				)
			])
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
				lib = true
			}: { plugins?: VitePlugin[]; lib?: boolean } = {}
		) => {
			const { NODE_ENV } = process.env
			process.env.NODE_ENV = "production"
			try {
				const config: InlineConfig = {
					root,
					configFile: false,
					logLevel: "silent",
					plugins: [...plugins, precompile.vite({ conditions, ...opts })],
					resolve: { conditions: [...conditions, ...defaultClientConditions] },
					build: {
						write: false,
						minify: true,
						...(lib && { lib: { entry: "main.ts", formats: ["es"] } })
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

		const run = (js: string) =>
			spawnSync(process.execPath, ["--input-type=module"], {
				input: js,
				encoding: "utf8"
			}).stdout

		it("leaves out of a production build what no read needs", async () => {
			const pruned = await bundle()
			const whole = await bundle({ prune: false })
			attest(run(pruned)).snap("name must be a string\n")
			attest(run(whole)).equals(run(pruned))
			attest(whole.includes("~standard")).equals(true)
			attest(pruned.includes("~standard")).equals(false)
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

		it("fails a build holding a module another plugin transformed", async () => {
			const asserting: VitePlugin = {
				name: "asserting",
				enforce: "pre",
				transform: (code, id) =>
					id.endsWith("/main.ts") ?
						code.replace("User({ name: 5 })", "User.assert({ name: 5 })")
					:	undefined
			}
			const error = await bundle({}, { plugins: [asserting] }).then(
				() => undefined,
				(e: Error) => e
			)
			attest(
				error?.message.endsWith(
					writeUnseenMessage(
						`it built ${join(root, "main.ts")} from other code than it read`
					)
				)
			).equals(true)
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

		it("refuses it with arktype-precompile", () => {
			attest(refusals(emitPrecompiled)).equals([
				writePruneHostMessage("arktype-precompile"),
				writePruneHostMessage("arktype-precompile")
			])
			for (const { stderr, status } of [
				runCli(fromHere(), "--check", "--prune"),
				runCli(settled, "--emit")
			]) {
				attest(status).equals(2)
				attest(
					stderr.startsWith(writePruneHostMessage("arktype-precompile"))
				).equals(true)
			}
		})
	})
})
