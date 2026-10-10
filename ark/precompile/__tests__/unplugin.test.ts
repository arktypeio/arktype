import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { writeStandaloneDependencyMessage } from "@ark/precompile"
import {
	precompile,
	type PrecompilePluginOptions
} from "@ark/precompile/unplugin"
import { context, build as esbuild } from "esbuild"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { Worker } from "node:worker_threads"
import {
	build as viteBuild,
	defaultClientConditions,
	defaultServerConditions,
	type InlineConfig,
	type Rolldown
} from "vite"
import { startVitest } from "vitest/node"
import { configureAfterTypeMessage } from "@ark/schema"
import { writeCreatedBeforeConfigureMessage } from "@ark/schema/runtime"
import { writeLibrary } from "./utils.ts"

const app = fromHere("app")

const library = writeLibrary()

const configured = fromHere("configured")

const runPlain = (root: string) =>
	spawnSync(process.execPath, ["--conditions", "ark-ts", "main.ts"], {
		cwd: root,
		encoding: "utf8"
	}).stdout

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

const viteConfig = (
	opts?: PrecompilePluginOptions,
	root = app
): InlineConfig => ({
	root,
	configFile: false,
	logLevel: "silent",
	plugins: opts ? [precompile.vite({ ...opts, conditions })] : [],
	resolve: { conditions: [...conditions, ...defaultClientConditions] },
	ssr: {
		resolve: {
			conditions: [...conditions, ...defaultServerConditions],
			externalConditions: conditions
		}
	}
})

const bundlers = {
	vite: async (opts?: PrecompilePluginOptions, root = app) => {
		const [{ output }] = (await viteBuild({
			...viteConfig(opts, root),
			build: {
				write: false,
				minify: true,
				lib: { entry: "main.ts", formats: ["es"] }
			}
		})) as Rolldown.RolldownOutput[]
		return output[0].code
	},
	esbuild: async (opts?: PrecompilePluginOptions, root = app) => {
		const { outputFiles } = await esbuild({
			entryPoints: [join(root, "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			minify: true,
			conditions,
			logLevel: "silent",
			plugins: opts ? [precompile.esbuild({ ...opts, conditions })] : []
		})
		return outputFiles[0].text
	}
}

// each thread a process starts takes the next id
const nextThreadId = () => {
	const worker = new Worker("", { eval: true })
	void worker.terminate()
	return worker.threadId
}

const run = (js: string) =>
	spawnSync(process.execPath, ["--input-type=module"], {
		input: js,
		encoding: "utf8"
	}).stdout

const writeFixture = (
	files: Record<string, string>,
	root = realpathSync(mkdtempSync(join(tmpdir(), "ark-precompile-")))
): string => {
	for (const path in files) {
		mkdirSync(dirname(join(root, path)), { recursive: true })
		writeFileSync(join(root, path), files[path])
	}
	return root
}

const fakePackage = (path: string, name: string, version: string) => ({
	[`${path}/package.json`]: JSON.stringify({
		name,
		version,
		type: "module",
		exports: {
			".": "./index.js",
			"./runtime": "./index.js",
			"./internal": "./index.js",
			"./*": "./*"
		}
	}),
	[`${path}/index.js`]:
		"export const type = () => {}\nexport const registerPrecompiledUnits = () => {}\n"
})

// a program whose packages import arktype, one of them from a copy of its own
const dependencies = writeFixture({
	...fakePackage("node_modules/arktype", "arktype", "2.2.0"),
	...fakePackage(
		"node_modules/arktype/node_modules/@ark/schema",
		"@ark/schema",
		"0.2.0"
	),
	...fakePackage("node_modules/@ark/schema", "@ark/schema", "0.1.0"),
	...fakePackage("node_modules/shared", "shared", "1.0.0"),
	"node_modules/shared/index.js":
		'import { type } from "arktype"\nexport const shared = typeof type\n',
	"node_modules/shared/other.js":
		'import { type } from "arktype"\nexport const other = typeof type\n',
	...fakePackage("node_modules/forked", "forked", "1.0.0"),
	...fakePackage(
		"node_modules/forked/node_modules/arktype",
		"arktype",
		"2.1.0"
	),
	"node_modules/forked/index.js":
		'import { type } from "arktype"\nexport const forked = typeof type\n',
	"shared.ts":
		'import { shared } from "shared"\nimport { other } from "shared/other.js"\nconsole.log(shared, other)\n',
	"forked.ts":
		'import { type } from "arktype"\nimport { forked } from "forked"\nexport const T = type("string")\nconsole.log(forked)\n',
	"schema.ts":
		'import "@ark/schema"\nimport { type } from "arktype"\nexport const T = type("string")\n'
})

const buildDependency = async (
	entry: string,
	opts: PrecompilePluginOptions = {}
) => {
	const result = await esbuild({
		entryPoints: [join(dependencies, entry)],
		absWorkingDir: dependencies,
		bundle: true,
		write: false,
		format: "esm",
		logLevel: "silent",
		plugins: [precompile.esbuild({ ...opts, cwd: dependencies })]
	}).catch((e: { errors: { text: string }[] }) => e)
	return [
		...result.errors.map(e => e.text),
		...("warnings" in result ? result.warnings.map(w => w.text) : [])
	].map(text => text.split(`${dependencies}/`).join(""))
}

// written while parsing a definition, which a standalone build never does
const parserMessage = "is unresolvable"

contextualize(() => {
	const expected = runPlain(app)

	it("runs without the plugin", () => {
		attest(JSON.parse(expected)).snap([
			{
				name: "Ada",
				email: "ada@example.com",
				age: 36,
				tags: ["math"],
				plan: "free"
			},
			'age must be an integer (was 36.5)\nemail must be an email address (was "ada")\nname must be non-empty\ntags must be at most length 3 (was 4)',
			'plan must be "free" or "pro" (was "team")\nrole must be "admin" or "member" (was "owner")',
			"value at [1].age must be non-negative (was -1)",
			{
				kind: "create",
				user: {
					name: "Ada",
					email: "ada@example.com",
					age: 36,
					tags: ["math"],
					plan: "free"
				}
			},
			{ kind: "delete", id: "c4a760a8-dbcf-4e14-9f39-645a8e933d74" },
			'id must be a UUID (was "1234")',
			'kind must be "delete" or "create" (was "update")',
			"@ada",
			{ handle: "@ada", joined: 2020 },
			'handle must be a handle (was "ada")',
			"next.next.value must be a number (was a string)",
			"next.value must be positive (was -1)",
			"children[1].value must be a number (was a string)",
			true,
			"box.children[0].value must be a number (was missing)"
		])
	})

	for (const [name, bundle] of Object.entries(bundlers)) {
		it(`${name} standalone`, async () => {
			const withArktype = await bundle()
			const standalone = await bundle({})
			attest(run(standalone)).equals(expected)
			attest([
				withArktype.includes(parserMessage),
				standalone.includes(parserMessage)
			]).equals([true, false])
		}).timeout(60000)

		it(`${name} cache`, async () => {
			attest(run(await bundle({ runtime: "arktype" }))).equals(expected)
		}).timeout(60000)

		it(`${name} runtime islands`, async () => {
			const islands = fromHere("islands")
			const standalone = await bundle(
				{ cwd: islands, config: "config.ts" },
				islands
			)
			attest(run(standalone)).equals(runPlain(islands))
			attest(standalone.includes(parserMessage)).equals(true)
		}).timeout(60000)

		it(`${name} packages that opt in`, async () => {
			const standalone = await bundle({ cwd: library }, library)
			attest(run(standalone)).equals(runPlain(library))
			attest(standalone.includes(parserMessage)).equals(false)
		}).timeout(60000)

		it(`${name} import cycle`, async () => {
			const cycle = fromHere("cycle")
			attest(run(await bundle({ cwd: cycle }, cycle))).equals(runPlain(cycle))
		}).timeout(60000)

		it(`${name} configured`, async () => {
			const opts = { cwd: configured, config: "config.ts" }
			const standalone = await bundle(opts, configured)
			attest(run(standalone)).equals(runPlain(configured))
			attest(standalone.includes(parserMessage)).equals(false)
			attest(
				run(await bundle({ ...opts, runtime: "arktype" }, configured))
			).equals(runPlain(configured))
		}).timeout(60000)
	}

	it("vite standalone for SSR, bundling Rolldown's runtime module", async () => {
		const config = viteConfig({})
		const { output } = (await viteBuild({
			...config,
			ssr: { ...config.ssr, noExternal: true },
			build: { write: false, ssr: "main.ts" }
		})) as Rolldown.RolldownOutput
		attest(run(output[0].code)).equals(expected)
	}).timeout(60000)

	it("keeps its worker across esbuild's rebuilds", async () => {
		const first = nextThreadId()
		const build = await context({
			entryPoints: [join(app, "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			conditions,
			logLevel: "silent",
			plugins: [precompile.esbuild({ cwd: app, conditions })]
		})
		await build.rebuild()
		await build.rebuild()
		await build.dispose()
		attest(nextThreadId() - first - 1).equals(1)
	}).timeout(60000)

	it("keeps a configured build's worker until its configuration changes", async () => {
		const root = fromHere("temp", "watched")
		const write = (file: string, text: string) =>
			writeFixture({ [file]: text }, root)
		const configure = (onUndeclaredKey: string) =>
			write(
				"config.ts",
				`import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "${onUndeclaredKey}" })\n`
			)
		configure("delete")
		write("label.ts", 'export const label = "first"\n')
		write(
			"main.ts",
			'import "./config.ts"\nimport { type } from "arktype"\nimport { label } from "./label.ts"\n\nconsole.log(label, JSON.stringify(type({ a: "string" })({ a: "x", b: 1 })))\n'
		)
		const first = nextThreadId()
		const build = await context({
			entryPoints: [join(root, "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			conditions,
			logLevel: "silent",
			plugins: [
				precompile.esbuild({ cwd: root, config: "config.ts", conditions })
			]
		})
		const rebuilt = async () => run((await build.rebuild()).outputFiles[0].text)
		const printed = [await rebuilt()]
		write("label.ts", 'export const label = "second"\n')
		printed.push(await rebuilt())
		const unchanged = nextThreadId()
		configure("ignore")
		printed.push(await rebuilt())
		await build.dispose()
		attest(printed).equals([
			'first {"a":"x"}\n',
			'second {"a":"x"}\n',
			'second {"a":"x","b":1}\n'
		])
		attest([unchanged - first - 1, nextThreadId() - unchanged - 1]).equals([
			1, 1
		])
	}).timeout(60000)

	it("gives each module's ParseError a thrower naming it", async () => {
		const definesInvalid = (name: string) =>
			`import { type } from "arktype"\n\nexport const ${name} = (() => {\n\ttry {\n\t\treturn type({ x: "strng" } as never).expression\n\t} catch (e) {\n\t\treturn (e as Error).message\n\t}\n})()\n`
		const root = writeFixture(
			{
				"config.ts":
					'import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "delete" })\n',
				"a.ts": definesInvalid("a"),
				"b.ts": definesInvalid("b"),
				"main.ts":
					'import { a } from "./a.ts"\nimport { b } from "./b.ts"\n\nconsole.log(JSON.stringify([a, b]))\n'
			},
			fromHere("temp", "throwers")
		)
		attest(
			JSON.parse(
				run(await bundlers.esbuild({ cwd: root, config: "config.ts" }, root))
			)
		).equals([
			writeCreatedBeforeConfigureMessage("a.ts"),
			writeCreatedBeforeConfigureMessage("b.ts")
		])
	}).timeout(60000)

	it("reads a module that defines a Type from an imported one", async () => {
		const { outputFiles } = await esbuild({
			stdin: {
				contents: `import { Admin } from "./admin.ts"
console.log(String(Admin({ name: "Ada", email: "ada@example.com", age: 36, tags: [], role: "member" })))`,
				resolveDir: app,
				loader: "ts"
			},
			bundle: true,
			write: false,
			format: "esm",
			logLevel: "silent",
			conditions,
			plugins: [precompile.esbuild({ cwd: app, conditions })]
		})
		attest(run(outputFiles[0].text)).equals(
			'role must be "admin" (was "member")\n'
		)
		attest(outputFiles[0].text.includes(parserMessage)).equals(false)
	}).timeout(60000)

	it("registers arktype's keyword table before arktype loads", async () => {
		// arktype and its keyword table resolve to files that print when they load
		const root = fromHere("keywordTable")
		const plugin = { runtime: "arktype" } as const
		const { outputFiles } = await esbuild({
			entryPoints: [fromHere("keywordTable", "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			logLevel: "silent",
			plugins: [precompile.esbuild(plugin)]
		})
		const [{ output }] = (await viteBuild({
			root,
			configFile: false,
			logLevel: "silent",
			plugins: [precompile.vite(plugin)],
			build: { write: false, lib: { entry: "main.ts", formats: ["es"] } }
		})) as Rolldown.RolldownOutput[]
		attest([run(outputFiles[0].text), run(output[0].code)]).snap([
			"config\nkeywords\narktype\nstring\n",
			"config\nkeywords\narktype\nstring\n"
		])
	}).timeout(60000)

	it("warns once for each dependency importing arktype in standalone mode", async () => {
		attest(await buildDependency("shared.ts")).equals([
			writeStandaloneDependencyMessage("shared")
		])
		attest(await buildDependency("shared.ts", { runtime: "arktype" })).equals(
			[]
		)
	}).timeout(60000)

	it("fails for a second copy of arktype", async () => {
		const vite = (runtime?: "arktype") =>
			viteBuild({
				root: dependencies,
				configFile: false,
				logLevel: "silent",
				plugins: [precompile.vite({ runtime, cwd: dependencies })],
				build: { write: false, lib: { entry: "forked.ts", formats: ["es"] } }
			}).then(
				() => "",
				(e: Error) => e.message
			)
		const report = `arktype resolves to more than one copy
  2.2.0 at node_modules/arktype, reached from forked.ts
  2.1.0 at node_modules/forked/node_modules/arktype, reached from node_modules/forked/index.js`
		for (const runtime of [undefined, "arktype"] as const) {
			const errors = await buildDependency("forked.ts", { runtime })
			attest(errors.some(text => text.includes(report))).equals(true)
			attest((await vite(runtime)).includes(report)).equals(true)
		}
	}).timeout(60000)

	it("fails for a second copy of a package arktype runs on", async () => {
		attest(
			(await buildDependency("schema.ts")).filter(text =>
				text.includes("more than one copy")
			)
		).snap([
			"schema.ts:2:22  @ark/schema resolves to more than one copy\n  0.1.0 at node_modules/@ark/schema, reached from schema.ts\n  0.2.0 at node_modules/arktype/node_modules/@ark/schema, reached from node_modules/arktype/index.js\n  Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides."
		])
	}).timeout(60000)

	it("keeps each meta an error or a Type exposes the object arktype's is", async () => {
		const root = writeFixture(
			{
				"name.ts": `import { type } from "arktype"

export const Name = type("string").configure({ description: "a name" })
`,
				"scoped.ts": `import { scope } from "arktype"

export const Scoped = scope({ X: "string" }).type({ x: "X" })
`,
				"main.ts": `import { scope, type } from "arktype"
import { Name } from "./name.ts"
import { Scoped } from "./scoped.ts"

const User = type({ name: Name })
const Short = type("string <= 3")
const ShortWord = type("string.alphanumeric <= 3")
const Tagged = type({ n: type("number").configure({ description: "tagged" }) })
const ScopedTagged = scope({}).type({ n: ["number", "@", { description: "tagged" }] })
const Local = scope({ Y: "string" }).type({ y: "Y" })
const metaOf = (out: unknown) => (out as { issues: { meta: object }[] }).issues[0].meta
console.log(
	JSON.stringify([
		metaOf(Name(5)) === Name.meta,
		metaOf(User({ name: 5 })) === Name.meta,
		metaOf(Short("abcd")) === metaOf(ShortWord("abcd")),
		metaOf(Tagged({ n: "x" })) === metaOf(ScopedTagged({ n: "x" })),
		metaOf(Scoped({ x: 5 })) === type("string").meta,
		metaOf(Local({ y: 5 })) === metaOf(Scoped({ x: 5 }))
	])
)
`
			},
			fromHere("temp", "metas")
		)
		const expected = "[true,true,true,false,true,true]\n"
		attest(runPlain(root)).equals(expected)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(expected)
	}).timeout(60000)

	it("creates a Type anew for each call where arktype does, though its content addresses it", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const trim = () => type("string.trim")
const plain = () => type({ a: "string" })
const narrowed = (fn: (s: string) => boolean) => type("string").narrow(fn)
const isLong = (s: string) => s.length > 3
const Trim = type("string.trim")
console.log(
	JSON.stringify([
		trim() === trim(),
		trim() === Trim,
		trim().meta === Trim.meta,
		plain() === plain(),
		narrowed(isLong) === narrowed(isLong)
	])
)
`
			},
			fromHere("temp", "eachCall")
		)
		const expected = "[false,false,true,true,true]\n"
		attest(runPlain(root)).equals(expected)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(expected)
	}).timeout(60000)

	it("composes the Type a binding holds, which its site creates once", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const Trim = type("string.trim")
const Box = type({ t: Trim })
console.log(Box.get("t") === Trim)
`
			},
			fromHere("temp", "once")
		)
		attest(runPlain(root)).equals("true\n")
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals("true\n")
	}).timeout(60000)

	it("creates one Type for a definition two modules share, and only the Types a bundle imports", async () => {
		const shared = `[
	type({ a: "string" }),
	type("string"),
	type("string.email"),
	type("string.trim"),
	type({ n: "number.integer" })
] as const`
		const root = writeFixture(
			{
				"a.ts": `import { type } from "arktype"

export const A = ${shared}
export const Unimported = type({ a: "'unimported'" })
`,
				"b.ts": `import { type } from "arktype"

export const B = ${shared}
`,
				"main.ts": `import { A } from "./a.ts"
import { B } from "./b.ts"

console.log(JSON.stringify(A.map((a, i) => [a === B[i], a.meta === B[i].meta])))
`
			},
			fromHere("temp", "shared")
		)
		const expected =
			"[[true,true],[true,true],[true,true],[false,true],[true,true]]\n"
		attest(runPlain(root)).equals(expected)
		const bundle = await bundlers.esbuild({ cwd: root }, root)
		attest(run(bundle)).equals(expected)
		attest(bundle.includes("unimported")).equals(false)
		attest(
			run(await bundlers.esbuild({ cwd: root, inline: true }, root))
		).equals(expected)
	}).timeout(60000)

	it("keeps apart the Types arktype creates apart, though their content is equal", async () => {
		const root = writeFixture(
			{
				"a.ts": `import { type } from "arktype"

export const Trim = type("string.trim")
export const Email = type("string.email")
`,
				"main.ts": `import { type } from "arktype"
import { Email, Trim } from "./a.ts"

const keyword = (name: "string.trim" | "string.email") => type(name)
const Int = type("number.integer")
const Mod = type("number % 1")
console.log(
	JSON.stringify([
		type("Record<string, number>") === type({ "[string]": "number" }),
		type("Exclude<string | number, number>") === type("string"),
		Int === Mod,
		Int.meta === Mod.meta,
		type("unknown.any") === type("unknown"),
		keyword("string.trim") === keyword("string.trim"),
		keyword("string.trim") === Trim,
		keyword("string.email") === Email,
		(type.keywords.string.email as unknown) === Email
	])
)
`
			},
			fromHere("temp", "apart")
		)
		const expected = "[false,false,false,false,false,false,false,true,true]\n"
		attest(runPlain(root)).equals(expected)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(expected)
	}).timeout(60000)

	it("shares a Type definitions reach through different copies whichever runs first", async () => {
		const files = {
			"string.ts": `import { type } from "arktype"

export const A = type({ a: "string" })
`,
			"keyof.ts": `import { type } from "arktype"

export const B = type({ a: type({ "[string]": "number" }).keyof() })
`
		}
		const log = `console.log(JSON.stringify([A === B, A.meta === B.meta, (A({ a: 1 }) as any).issues[0].meta === (B({ a: 1 }) as any).issues[0].meta]))\n`
		const orders = {
			stringFirst:
				'import { A } from "./string.ts"\nimport { B } from "./keyof.ts"\n',
			keyofFirst:
				'import { B } from "./keyof.ts"\nimport { A } from "./string.ts"\n'
		}
		for (const [name, imports] of Object.entries(orders)) {
			const root = writeFixture(
				{ ...files, "main.ts": `${imports}\n${log}` },
				fromHere("temp", name)
			)
			attest(runPlain(root)).equals("[true,true,true]\n")
			attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(
				"[true,true,true]\n"
			)
		}
	}).timeout(60000)

	it("keeps a meta holding a Type the one another module's errors expose", async () => {
		const root = writeFixture(
			{
				"a.ts": `import { type } from "arktype"

export const Other = type({ o: "number" })
export const T = type("string").configure({ example: Other } as {})
export const W = type({ t: T, list: T.array() })
`,
				"b.ts": `import { type } from "arktype"
import { T, W } from "./a.ts"

export const V = type({ w: W, t: T })
`,
				"main.ts": `import { Other, T, W } from "./a.ts"
import { V } from "./b.ts"

const first = (out: unknown) => (out as { issues: { meta: any }[] }).issues[0]
const fromW = first(W({ t: 1, list: [] }))
const fromV = first(V({ w: { t: 1, list: [] }, t: "" }))
console.log(JSON.stringify([fromV.meta === T.meta, fromV.meta === fromW.meta, fromV.meta.example === Other]))
`
			},
			fromHere("temp", "metaType")
		)
		attest(runPlain(root)).equals("[true,true,true]\n")
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(
			"[true,true,true]\n"
		)
	}).timeout(60000)

	it("fixes the configuration where a Type a bundle drops was created", async () => {
		const root = writeFixture(
			{
				"config.ts":
					'import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "delete" })\n',
				"unread.ts":
					'import { type } from "arktype"\n\nconst Unread = type({ dropped: "string" })\n',
				"main.ts": 'import "./unread.ts"\nimport "./config.ts"\n'
			},
			fromHere("temp", "dropped")
		)
		const stderrOf = (args: string[], input?: string) =>
			spawnSync(process.execPath, args, { cwd: root, input, encoding: "utf8" })
				.stderr
		attest(
			stderrOf(["--conditions", "ark-ts", "main.ts"]).includes(
				configureAfterTypeMessage
			)
		).equals(true)
		const bundle = await bundlers.esbuild(
			{ cwd: root, config: "config.ts" },
			root
		)
		attest(bundle.includes("dropped")).equals(false)
		attest(
			stderrOf(["--input-type=module"], bundle).includes(
				writeCreatedBeforeConfigureMessage("unread.ts")
			)
		).equals(true)
	}).timeout(60000)

	it("throws writing to a frozen input from a CommonJS bundle", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const T = type(["Function", "&", { "a?": "string.trim" }])
try {
	T(Object.freeze(Object.assign(() => 5, { a: " x " })))
} catch (e) {
	console.log((e as Error).name)
}
`,
				// esbuild adds the directive itself where a tsconfig implies it
				"tsconfig.json": "{}"
			},
			fromHere("temp", "commonjs")
		)
		const { outputFiles } = await esbuild({
			entryPoints: [join(root, "main.ts")],
			bundle: true,
			write: false,
			format: "cjs",
			logLevel: "silent",
			conditions,
			plugins: [precompile.esbuild({ cwd: root, conditions })]
		})
		attest(
			spawnSync(process.execPath, ["--input-type=commonjs"], {
				input: outputFiles[0].text,
				encoding: "utf8"
			}).stdout
		).equals("TypeError\n")
	}).timeout(60000)

	it("reports what the standalone runtime's frozen values reject", async () => {
		const root = writeFixture({
			"write.ts":
				'import { type } from "arktype"\nexport const T = type("string")\n;(T as any).note = 1\n',
			"sloppy.cts":
				'import { type } from "arktype"\nexport const T = type("string")\n'
		})
		const errorsOf = (entry: string) =>
			esbuild({
				entryPoints: [join(root, entry)],
				bundle: true,
				write: false,
				logLevel: "silent",
				plugins: [precompile.esbuild({ cwd: root, conditions })]
			}).then(
				() => [],
				(e: { errors: { text: string }[] }) =>
					e.errors.map(error => error.text.split(`${root}/`).join(""))
			)
		attest([await errorsOf("write.ts"), await errorsOf("sloppy.cts")]).snap([
			[
				'write.ts:3:2  (T as any).note = 1 writes to an arktype value, which throws at runtime\n  `T` is an arktype value, which the standalone runtime freezes with what it holds\n  Keep what you attach in an object of your own, or build with runtime: "arktype".'
			],
			[
				'sloppy.cts:1:1  sloppy.cts is not strict mode code\n  the standalone runtime freezes arktype values, and outside strict mode a write to a frozen value is ignored rather than throwing\n  Add "use strict" at the top of the module, or make it an ES module.'
			]
		])
	}).timeout(60000)

	it("vitest", async () => {
		for (const runtime of [undefined, "arktype"] as const) {
			const vitest = await startVitest(
				[],
				{
					root: app,
					config: false,
					watch: false,
					reporters: [],
					env: { ARKTYPE_RUNTIME: runtime ?? "" }
				},
				viteConfig({ runtime })
			)
			await vitest.close()
			attest(vitest.state.getCountOfFailedTests()).equals(0)
		}
	}).timeout(60000)

	it("vitest configured", async () => {
		for (const runtime of [undefined, "arktype"] as const) {
			const vitest = await startVitest(
				[],
				{
					root: configured,
					config: false,
					watch: false,
					reporters: [],
					env: { EXPECTED: runPlain(configured) }
				},
				viteConfig(
					{ runtime, cwd: configured, config: "config.ts" },
					configured
				)
			)
			await vitest.close()
			attest([
				vitest.state.getCountOfFailedTests(),
				vitest.state.getFiles().length
			]).equals([0, 1])
		}
	}).timeout(60000)

	it("vitest checks what each factory was built with at creation", async () => {
		const checks = fromHere("checks")
		const vitest = await startVitest(
			[],
			{
				root: checks,
				config: false,
				watch: false,
				reporters: [],
				env: { ARK_MODE: "loose" }
			},
			viteConfig(
				{ cwd: checks, define: { "process.env.ARK_MODE": "loose" } },
				checks
			)
		)
		await vitest.close()
		attest(
			vitest.state
				.getFiles()
				.flatMap(file => file.tasks)
				.map(task => `${task.result?.state} ${task.name}`)
		).snap([
			"pass creates each validator from what the build read",
			"pass a mocked module",
			"pass a mocked static helper",
			"pass a stubbed define",
			"pass a mutated import",
			"pass a mutated import another site reads elsewhere",
			"pass a mutated plain object",
			"pass a hole with another arity",
			"pass a hole of another kind",
			"pass a hole with another prototype",
			"pass a polyfilled builtin"
		])
	}).timeout(60000)

	it("vitest with a package that opts in", async () => {
		for (const runtime of [undefined, "arktype"] as const) {
			const vitest = await startVitest(
				[],
				{
					root: library,
					config: false,
					watch: false,
					reporters: [],
					env: { ARKTYPE_RUNTIME: runtime ?? "" }
				},
				viteConfig({ runtime, cwd: library }, library)
			)
			await vitest.close()
			attest([
				vitest.state.getCountOfFailedTests(),
				vitest.state.getFiles().length
			]).equals([0, 1])
		}
	}).timeout(60000)
})
