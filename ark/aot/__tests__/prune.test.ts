import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { Precompiler, type PrecompileOptions } from "@ark/aot"
import { linkBundle } from "@ark/aot/internal/link.ts"
import { scanProgram, writeUnseenMessage } from "@ark/aot/internal/scan.ts"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build, context, type BuildOptions, type Plugin } from "esbuild"
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, posix } from "node:path"
import { memoryHost, normalized, writeFixture } from "./utils.ts"

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

contextualize(() => {
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

		it("keeps a build other than for production whole", async () => {
			const development = { conditions: ["ark-ts"] }
			attest(await bundle({}, development)).equals(
				await bundle({ prune: false }, development)
			)
		})

		it("keeps a bundle whole where a plugin after it may load a module", async () => {
			const plugins = [{ name: "after", setup: () => {} }]
			attest(await bundle({}, { plugins })).equals(
				await bundle({ prune: false }, { plugins })
			)
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
})
