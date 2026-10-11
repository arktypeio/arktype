import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { writeStandaloneDependencyMessage } from "@ark/precompile"
import {
	precompile,
	type PrecompilePluginOptions
} from "@ark/precompile/unplugin"
import { context, build as esbuild, transformSync, type Plugin } from "esbuild"
import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
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
import {
	writeCreatedBeforeConfigureMessage,
	writtenConfigMessage
} from "@ark/schema/runtime"
import { writeCreationMismatchMessage } from "arktype/runtime"
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

// a minified class is printed with its error's name, as `ce [ParseError]: `
const thrownBy = (js: string) =>
	/^(?:\w+ \[)?\w*Error]?: (.*)$/m.exec(
		spawnSync(process.execPath, ["--input-type=module"], {
			input: js,
			encoding: "utf8"
		}).stderr
	)?.[1]

const fixtures: string[] = []

const fixtureDir = () => {
	const dir = realpathSync(mkdtempSync(join(tmpdir(), "ark-precompile-")))
	fixtures.push(dir)
	return dir
}

const writeFixture = (
	files: Record<string, string>,
	root = fixtureDir()
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
const dependencyFiles = {
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
}

let dependencies: string

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
	before(() => {
		dependencies = writeFixture(dependencyFiles)
	})

	after(() => {
		for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true })
	})

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
			// a json module the cycle reaches before it runs
			const files = Object.fromEntries(
				readdirSync(cycle).map(file => [
					file,
					readFileSync(join(cycle, file), "utf8")
				])
			)
			const introspected = writeFixture(
				{
					...files,
					"items.ts": `${files["items.ts"]}
export function itemJson() {
	return type({ id: "number" }).json
}
`,
					"checkItem.ts": `import { itemJson } from "./items.ts"

export const checkedItem = JSON.stringify(itemJson())
`
				},
				fromHere("temp", `${name}CycleJson`)
			)
			attest(
				run(
					await bundle(
						{ cwd: introspected, introspection: ["json"] },
						introspected
					)
				)
			).equals(runPlain(introspected))
		}).timeout(60000)

		it(`${name} static introspection`, async () => {
			const introspected = fromHere("introspected")
			const standalone = await bundle(
				{ cwd: introspected, introspection: ["toJsonSchema"] },
				introspected
			)
			attest(run(standalone)).equals(runPlain(introspected))
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

	it("vite configured, with a plugin ahead of arktype's transpiling the config module", async () => {
		const config = viteConfig(
			{ cwd: configured, config: "config.ts" },
			configured
		)
		const transpile = {
			name: "transpile",
			enforce: "pre" as const,
			transform: (code: string, id: string) =>
				id.endsWith("/config.ts") ?
					transformSync(code, { loader: "ts" }).code
				:	undefined
		}
		const [{ output }] = (await viteBuild({
			...config,
			plugins: [transpile, ...config.plugins!],
			build: {
				write: false,
				lib: { entry: "main.ts", formats: ["es"] }
			}
		})) as Rolldown.RolldownOutput[]
		attest(run(output[0].code)).equals(runPlain(configured))
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

	it("precompiles a definition that runs again, whether arktype keeps its values the same each run or shares them with another site", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { scope } from "arktype"

const $ = scope({ a: "string" })
const exported = () => $.export()
const twice = () => {
	const local = scope({ a: "string" })
	return [local.type("a"), local.type("a")]
}
const isLong = (s: string) => s.length > 1
const mapped = () => {
	const local = scope({ a: "string" })
	return [0].map(() => local.type("a").narrow(isLong))[0]
}
console.log(exported().a(1).toString())
console.log(twice()[1]("x"))
// a minifier renames isLong
console.log(mapped()("x").toString().replace(/according to \\w+/, "according to isLong"))
`
			},
			fromHere("temp", "eachRun")
		)
		const expected = `must be a string (was a number)
x
must be valid according to isLong (was "x")
`
		attest(runPlain(root)).equals(expected)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(expected)
	}).timeout(60000)

	it("creates each Date or RegExp a definition that runs again holds anew, as arktype does", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { scope, type } from "arktype"

const dated = () => scope({ d: "d'2001-01-01'" }).type({ at: "d" })
const exemplified = () => type("string").configure({ examples: [/a/] as never })
const unitOf = (out: any) => out.issues[0].unit
Date.prototype.setFullYear.call(unitOf(dated()({ at: 0 })), 1999)
console.log(unitOf(dated()({ at: 0 })).getUTCFullYear())
const exampleOf = (out: any) => out.issues[0].meta.examples[0]
exampleOf(exemplified()(1)).compile("b")
console.log(exampleOf(exemplified()(1)).source)
`
			},
			fromHere("temp", "writtenEachRun")
		)
		const expected = "2001\na\n"
		attest(runPlain(root)).equals(expected)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(expected)
	}).timeout(60000)

	it("creates only the Types a bundle imports", async () => {
		const root = writeFixture(
			{
				"a.ts": `import { type } from "arktype"

export const A = type({ a: "string" })
export const Unimported = type({ a: "'unimported'" })
`,
				"main.ts": `import { A } from "./a.ts"

console.log(A({ a: 1 }).toString())
`
			},
			fromHere("temp", "imported")
		)
		const expected = "a must be a string (was a number)\n"
		attest(runPlain(root)).equals(expected)
		const bundle = await bundlers.esbuild({ cwd: root }, root)
		attest(run(bundle)).equals(expected)
		attest(bundle.includes("unimported")).equals(false)
	}).timeout(60000)

	it("precompiles a structure whose predicate reads ctx, which an intersection's Apply checks before its own predicate", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const isFilled = (s: string, ctx: any) => s.length > 0 || ctx.reject("non-empty")
const double = (s: string) => s + s
const isEven = (o: object) => Object.keys(o).length % 2 === 0
const T = type([["string", ":", isFilled], [["string", "=>", double], "?"]]).and(
	type(["object", ":", isEven])
)
// a minifier renames isEven
for (const data of [["a"], ["a", "b"], [""], ["a", 2]])
	console.log(T(data).toString().replace(/according to \\w+/, "according to isEven"))
`
			},
			fromHere("temp", "branchAllows")
		)
		const expected = `must be valid according to isEven (was ["a"])
a,bb
value at [0] must be non-empty (was "")
value at [1] must be a string (was a number)
`
		attest(runPlain(root)).equals(expected)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(expected)
	}).timeout(60000)

	it("drops the validator of a Type its own module reads only for its introspection", async () => {
		const files = {
			"user.ts": `import { type } from "arktype"

console.log("user.ts")
export const User = type({ name: "string", age: "number.integer" })
`,
			// TypeScript's defaults, which drop an import nothing reads
			"tsconfig.json": "{}"
		}
		const local = writeFixture(
			{
				...files,
				"main.ts": `import { type } from "arktype"

const User = type({ name: "string", age: "number.integer" })
console.log(JSON.stringify(User.toJsonSchema()))
`
			},
			fromHere("temp", "introspectedOnly")
		)
		const bundle = await bundlers.esbuild({ cwd: local }, local)
		attest(run(bundle)).equals(runPlain(local))
		attest(bundle.includes("traverseAllows")).equals(false)
		const imported = writeFixture(
			{
				...files,
				"main.ts": `import { User } from "./user.ts"

console.log(JSON.stringify(User.toJsonSchema()))
`
			},
			fromHere("temp", "introspectedImport")
		)
		attest(run(await bundlers.esbuild({ cwd: imported }, imported))).equals(
			runPlain(imported)
		)
	}).timeout(60000)

	it("keeps the module of an import a fold reads beside a local of its name", async () => {
		const root = writeFixture(
			{
				"user.ts": `import { type } from "arktype"

console.log("user.ts")
export const User = type({ name: "string" })
`,
				"tsconfig.json": "{}",
				"main.ts": `import { type } from "arktype"
import { User } from "./user.ts"

console.log(JSON.stringify(User.toJsonSchema()))
export const relabel = (o: { label: string }) => {
	o.label = "changed"
}
{
	const User = { label: "a user" }
	console.log(type("string").describe(User.label).description)
}
`
			},
			fromHere("temp", "shadowedImport")
		)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(
			runPlain(root)
		)
	}).timeout(60000)

	it("creates a Type read only for its introspection where its creation compares what the program holds", async () => {
		const files = {
			"data.ts": `export const settings = { label: "a user" }
`,
			"mutate.ts": `import { settings } from "./data.ts"

settings.label = "changed"
`,
			"user.ts": `import { type } from "arktype"
import { settings } from "./data.ts"

export const User = type({ name: "string" }).describe(settings.label)
`
		}
		// arktype reads the label where it creates User, which precedes the change
		const after = writeFixture(
			{
				...files,
				"main.ts": `import { User } from "./user.ts"
import "./mutate.ts"

console.log(User.toJsonSchema().description)
`
			},
			fromHere("temp", "comparedAfter")
		)
		attest(run(await bundlers.esbuild({ cwd: after }, after))).equals(
			runPlain(after)
		)
		const mains = {
			imported: `import "./mutate.ts"
import { User } from "./user.ts"

console.log(User.toJsonSchema().description)
`,
			local: `import "./mutate.ts"
import { type } from "arktype"
import { settings } from "./data.ts"

const User = type({ name: "string" }).describe(settings.label)
console.log(User.toJsonSchema().description)
`,
			composed: `import "./mutate.ts"
import { type } from "arktype"
import { settings } from "./data.ts"

const User = type({ name: "string" }).describe(settings.label)
const Admin = User.and({ admin: "true" })
console.log(Admin.description)
`
		}
		for (const [name, main] of Object.entries(mains)) {
			const root = writeFixture(
				{ ...files, "main.ts": main },
				fromHere("temp", `compared${name}`)
			)
			attest(thrownBy(await bundlers.esbuild({ cwd: root }, root))).equals(
				writeCreationMismatchMessage(
					"`settings.label`",
					'"changed"',
					'"a user"'
				)
			)
		}
	}).timeout(60000)

	it("checks a default where arktype creates its Type, though nothing reads the Type, a site reads only its introspection or another Type's in a package with no side effects", async () => {
		const definition = `type({ a: type(["number", ":", n => n > limits.min]).default(5) })`
		const files = {
			// a schema the build can write without the predicate's name
			"config.ts": `import { configure } from "arktype/config"

configure({ toJsonSchema: { fallback: { predicate: ctx => ctx.base } } })
`,
			"limits.ts": `export const limits = { min: 0 }
`,
			"raise.ts": `import { limits } from "./limits.ts"

limits.min = 10
`,
			"t.ts": `import { type } from "arktype"
import { limits } from "./limits.ts"

export const T = ${definition}
`
		}
		const mains = {
			imported: `import "./config.ts"
import "./raise.ts"
import { T } from "./t.ts"

console.log(JSON.stringify(T.toJsonSchema()))
`,
			local: `import "./config.ts"
import "./raise.ts"
import { type } from "arktype"
import { limits } from "./limits.ts"

const T = ${definition}
console.log(JSON.stringify(T.toJsonSchema()))
`,
			unread: `import "./config.ts"
import "./raise.ts"
import { type } from "arktype"
import { limits } from "./limits.ts"

const T = ${definition}
console.log("unread")
`
		}
		const results: Record<string, unknown> = {}
		for (const [name, main] of Object.entries(mains)) {
			const root = writeFixture(
				{ ...files, "main.ts": main },
				fromHere("temp", `defaultChecked${name}`)
			)
			results[name] = thrownBy(
				await bundlers.esbuild({ cwd: root, config: "config.ts" }, root)
			)
		}
		// a bundler drops each module of such a package whose exports nothing reads, whatever its statements do
		const sideEffectFree = writeFixture(
			{
				...files,
				"config.ts": `${files["config.ts"]}export const configured = true\n`,
				"raise.ts": `${files["raise.ts"]}export const raised = true\n`,
				"main.ts": `import { configured } from "./config.ts"
import { raised } from "./raise.ts"
import { T } from "./t.ts"

console.log(configured, raised, JSON.stringify(T.toJsonSchema()))
`,
				"package.json": `{ "type": "module", "sideEffects": false }`
			},
			fromHere("temp", "defaultCheckedSideEffectFree")
		)
		results.sideEffectFree = thrownBy(
			await bundlers.esbuild(
				{ cwd: sideEffectFree, config: "config.ts" },
				sideEffectFree
			)
		)
		// the module's other creations run where a site reads any of its Types, in the package or one a workspace links
		const siblings = `${files["t.ts"]}export const U = type({ b: "string" })\n`
		const siblingFree = writeFixture(
			{
				...files,
				"config.ts": `${files["config.ts"]}export const configured = true\n`,
				"raise.ts": `${files["raise.ts"]}export const raised = true\n`,
				"t.ts": siblings,
				"main.ts": `import { configured } from "./config.ts"
import { raised } from "./raise.ts"
import { U } from "./t.ts"

console.log(configured, raised, JSON.stringify(U.toJsonSchema()))
`,
				"package.json": `{ "type": "module", "sideEffects": false }`
			},
			fromHere("temp", "defaultCheckedSiblingSideEffectFree")
		)
		results.sibling = thrownBy(
			await bundlers.esbuild(
				{ cwd: siblingFree, config: "config.ts" },
				siblingFree
			)
		)
		const workspace = writeFixture(
			{
				"config.ts": `${files["config.ts"]}export const configured = true\n`,
				"raise.ts": `import { limits } from "pkg/limits"

limits.min = 10
export const raised = true
`,
				"main.ts": `import { configured } from "./config.ts"
import { raised } from "./raise.ts"
import { U } from "pkg/t"

console.log(configured, raised, JSON.stringify(U.toJsonSchema()))
`,
				"package.json": `{ "type": "module" }`,
				"packages/pkg/limits.ts": files["limits.ts"],
				"packages/pkg/t.ts": siblings,
				"packages/pkg/package.json": `{ "name": "pkg", "type": "module", "sideEffects": false, "exports": { "./t": "./t.ts", "./limits": "./limits.ts" } }`
			},
			fromHere("temp", "defaultCheckedWorkspace")
		)
		rmSync(join(workspace, "node_modules"), { recursive: true, force: true })
		mkdirSync(join(workspace, "node_modules"))
		symlinkSync("../packages/pkg", join(workspace, "node_modules", "pkg"))
		results.workspace = thrownBy(
			await bundlers.esbuild({ cwd: workspace, config: "config.ts" }, workspace)
		)
		const helped = writeFixture(
			{
				...files,
				"config.ts": `${files["config.ts"]}export const configured = true\n`,
				"raise.ts": `${files["raise.ts"]}export const raised = true\n`,
				"t.ts": `${files["t.ts"]}export const make = () => type({ b: "string" })\n`,
				"u.ts": `import { make } from "./t.ts"

export const U = make()
`,
				"main.ts": `import { configured } from "./config.ts"
import { raised } from "./raise.ts"
import { U } from "./u.ts"

console.log(configured, raised, JSON.stringify(U.toJsonSchema()))
`,
				"package.json": `{ "type": "module", "sideEffects": false }`
			},
			fromHere("temp", "defaultCheckedHelped")
		)
		results.helped = thrownBy(
			await bundlers.esbuild({ cwd: helped, config: "config.ts" }, helped)
		)
		attest(results).snap({
			imported:
				"Default must be valid according to an anonymous predicate (was 5)",
			local:
				"Default must be valid according to an anonymous predicate (was 5)",
			unread:
				"Default must be valid according to an anonymous predicate (was 5)",
			sideEffectFree:
				"Default must be valid according to an anonymous predicate (was 5)",
			sibling:
				"Default must be valid according to an anonymous predicate (was 5)",
			workspace:
				"Default must be valid according to an anonymous predicate (was 5)",
			helped:
				"Default must be valid according to an anonymous predicate (was 5)"
		})
	}).timeout(60000)

	it("keeps a module validating as it loads where a fold reads another of its Types in a package with no side effects", async () => {
		const root = writeFixture(
			{
				"a.ts": `import { type } from "arktype"

const Env = type({ PORT: "string.numeric" })
export const env = Env.assert({ PORT: "x" })
export const U = type({ b: "string" })
`,
				"main.ts": `import { U } from "./a.ts"

console.log(JSON.stringify(U.json))
`,
				"package.json": `{ "type": "module", "sideEffects": false }`
			},
			fromHere("temp", "validatedAtLoad")
		)
		attest(
			thrownBy(
				await bundlers.esbuild({ cwd: root, introspection: ["json"] }, root)
			)
		).snap('PORT must be a well-formed numeric string (was "x")')
	})

	it("checks each function a definition reads where arktype would, though its Type drops it or a site reads only its introspection", async () => {
		const definitions = {
			thrown: `type(["'a'", "=>", double]).or(type({})).toJsonSchema()`,
			called: `type([["null", ":", isPositive], "[]"])`,
			json: `type([]).or(type([["null", ":", isPositive], "[]"])).json`
		}
		const errorOf = (root: string, file: string) =>
			/^\w*Error: (.*)$/m.exec(
				spawnSync(process.execPath, ["--conditions", "ark-ts", file], {
					cwd: root,
					encoding: "utf8"
				}).stderr
			)?.[1]
		const results: Record<string, unknown> = {}
		for (const [name, definition] of Object.entries(definitions)) {
			const root = writeFixture(
				{
					"package.json": `{ "type": "module" }`,
					"containers.js": `export const double = data => (typeof data === "number" ? data * 2 : data)
export const isPositive = (data, ctx) => typeof data !== "number" || data > 0 || ctx.reject("positive")
`,
					"main.js": `import { type } from "arktype"
import { double, isPositive } from "./containers.js"

${definition}
`
				},
				fromHere("temp", `checkedHoles${name}`)
			)
			const { outputFiles } = await esbuild({
				entryPoints: [join(root, "main.js")],
				bundle: true,
				write: false,
				format: "esm",
				minify: true,
				conditions,
				// e.g. a module the runtime resolves to another copy than the build read
				external: ["./containers.js"],
				logLevel: "silent",
				plugins: [precompile.esbuild({ cwd: root, conditions })]
			})
			writeFileSync(join(root, "bundle.js"), outputFiles[0].text)
			writeFileSync(
				join(root, "containers.js"),
				`export const double = Symbol("double")\nexport const isPositive = Symbol("isPositive")\n`
			)
			results[name] = [errorOf(root, "main.js"), errorOf(root, "bundle.js")]
		}
		attest(results).snap({
			thrown: [
				"Morph expression requires a function following '=>' (was symbol)",
				"`double` (main.js:4:20) is Symbol(double), but was precompiled as a function of 1 parameter"
			],
			called: [
				"Narrow expression requires a function following ':' (was symbol)",
				"`isPositive` (main.js:4:21) is Symbol(isPositive), but was precompiled as a function of 2 or more parameters"
			],
			json: [
				"Narrow expression requires a function following ':' (was symbol)",
				"`isPositive` (main.js:4:33) is Symbol(isPositive), but was precompiled as a function of 2 or more parameters"
			]
		})
	}).timeout(60000)

	it("orders what a minified bundle creates by the names its minifier gave the functions", async () => {
		const root = writeFixture(
			{
				"package.json": `{ "type": "module" }`,
				"functions.ts": `export const isSmall = (n: number) => n < 10
export const isEven = (n: number) => n % 2 === 0
export class Cat {}
export class Bird {}
export const now = () => 1
export const later = () => 2
`,
				"main.ts": `import { type } from "arktype"
import * as functions from "./functions.ts"
const { isSmall, isEven, Cat, Bird, now, later } = functions
const SmallOrEven = type("number").narrow(isSmall).or(type("number").narrow(isEven))
const Pet = type.instanceOf(Cat).or(type.instanceOf(Bird))
const Times = type({ start: ["number", "=", now], end: ["number", "=", later] })
console.log(JSON.stringify({
	names: Object.fromEntries(Object.entries(functions).map(([k, fn]) => [k, fn.name])),
	smallOrEven: SmallOrEven(15).toString(),
	pet: Pet.expression,
	times: Times({})
}))
`,
				// the program as written, its functions given the names the minifier gave them before it defines its Types
				"renamed.ts": `import * as functions from "./functions.ts"
const names = JSON.parse(process.env.NAMES!)
for (const [k, fn] of Object.entries(functions))
	Object.defineProperty(fn, "name", { value: names[k] })
await import("./main.ts")
`,
				"contextual.ts": `import { type } from "arktype"
import { isSmall } from "./functions.ts"
const isEven = (n: number, ctx: { mustBe: (s: string) => false }) =>
	n % 2 === 0 || ctx.mustBe("even")
console.log(type("number").narrow(isSmall).or(type("number").narrow(isEven))(15))
`
			},
			fromHere("temp", "minified")
		)
		const precompiled = JSON.parse(
			run(await bundlers.esbuild({ cwd: root }, root))
		)
		const renamed = spawnSync(
			process.execPath,
			["--conditions", "ark-ts", "renamed.ts"],
			{
				cwd: root,
				encoding: "utf8",
				env: { ...process.env, NAMES: JSON.stringify(precompiled.names) }
			}
		).stdout
		attest(precompiled).equals(JSON.parse(renamed))
		// arktype passes a context to a predicate of 2 parameters, so whichever name a minifier gives each can't change which branch passes one
		const contextual = await esbuild({
			entryPoints: [join(root, "contextual.ts")],
			bundle: true,
			write: false,
			minify: true,
			logLevel: "silent",
			conditions,
			plugins: [precompile.esbuild({ cwd: root, conditions })]
		}).then(
			() => [],
			(e: { errors: { text: string }[] }) =>
				e.errors.map(error => error.text.split(`${root}/`).join(""))
		)
		attest(contextual).snap([
			'contextual.ts:5:13  type("number").narrow(isSmall).or(type("number").narrow(isE… can\'t be precompiled to a standalone validator yet\n  an order that depends on the name of `isEven` (contextual.ts:5:69) can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
		])
	}).timeout(60000)

	it("prints once the siblings a build minifying its chunks apart names alike", async () => {
		// each module exports the value it is named for
		const shared: Record<string, string> = {
			isEven: "export const isEven = (n: number) => n % 2 === 0\n",
			isOdd: "export const isOdd = (n: number) => n % 2 === 1\n",
			isRound: "export const isRound = (n: number) => n % 10 === 0\n",
			Cat: "export class Cat { meow = 1 }\n",
			Dog: "export class Dog { bark = 1 }\n"
		}
		const root = writeFixture(
			{
				"package.json": `{ "type": "module" }`,
				...Object.fromEntries(
					Object.entries(shared).flatMap(([name, source]) => [
						[`${name}.ts`, source],
						// an entry of its own imports it too, so it is a chunk of its own
						[
							`${name}Entry.ts`,
							`import { ${name} } from "./${name}.ts"\nconsole.log(${name})\n`
						]
					])
				),
				"main.ts": `import { type } from "arktype"
import { isEven } from "./isEven.ts"
import { isOdd } from "./isOdd.ts"
import { isRound } from "./isRound.ts"
import { Cat } from "./Cat.ts"
import { Dog } from "./Dog.ts"
const Parity = type("number").narrow(isEven).or(type("number").narrow(isOdd))
const Nested = type({ a: Parity }).or(type({ a: type("number").narrow(isRound) }))
const Owner = type({ pet: type.instanceOf(Cat).and({ name: "string" }).or(type.instanceOf(Dog).and({ name: "string" })) })
console.log(JSON.stringify([isEven.name, isOdd.name, isRound.name, Cat.name, Dog.name, Parity.description, Parity(1.5).toString(), Nested.description, Owner({}).toString()]))
`
			},
			fromHere("temp", "chunks")
		)
		// Vite minifies each chunk on its own, naming its functions apart from those of other chunks
		const runChunks = async (outdir: string, plugins: Plugin[]) => {
			const { outputFiles } = await esbuild({
				entryPoints: [
					"main",
					...Object.keys(shared).map(name => `${name}Entry`)
				].map(entry => join(root, `${entry}.ts`)),
				bundle: true,
				splitting: true,
				write: false,
				format: "esm",
				outdir: join(root, outdir),
				conditions,
				logLevel: "silent",
				plugins
			})
			for (const file of outputFiles) {
				mkdirSync(dirname(file.path), { recursive: true })
				writeFileSync(
					file.path,
					transformSync(file.text, { minify: true, format: "esm" }).code
				)
			}
			return spawnSync(process.execPath, [join(root, outdir, "main.js")], {
				encoding: "utf8"
			}).stdout
		}
		const precompiled = await runChunks("precompiled", [
			precompile.esbuild({ cwd: root, conditions })
		])
		const [evenName, oddName, roundName, catName, dogName] =
			JSON.parse(precompiled)
		attest([oddName, roundName, dogName]).equals([evenName, evenName, catName])
		attest(precompiled).equals(await runChunks("plain", []))
	}).timeout(60000)

	it("folds the json of a Type a Scope's method creates", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { scope } from "arktype"

const atMost = (n: number) => {
	const limit = 10
	return n <= limit
}
console.log(JSON.stringify(scope({}).type({ a: [["number", ":", atMost], "=", 5] }).omit("a").json))
`
			},
			fromHere("temp", "scopedJson")
		)
		attest(runPlain(root)).snap(`{"domain":"object"}
`)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(
			runPlain(root)
		)
	}).timeout(60000)

	it("fixes the configuration where a Type a bundle drops was created", async () => {
		const unread = {
			validator: 'const Unread = type({ dropped: "string" })',
			introspection: 'const schema = type({ dropped: "string" }).toJsonSchema()'
		}
		for (const [name, statement] of Object.entries(unread)) {
			const root = writeFixture(
				{
					"config.ts":
						'import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "delete" })\n',
					"unread.ts": `import { type } from "arktype"\n\n${statement}\n`,
					"main.ts": 'import "./unread.ts"\nimport "./config.ts"\n'
				},
				fromHere("temp", `dropped${name}`)
			)
			const stderrOf = (args: string[], input?: string) =>
				spawnSync(process.execPath, args, {
					cwd: root,
					input,
					encoding: "utf8"
				}).stderr
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
		}
	}).timeout(60000)

	it("leaves the configuration's check out of a bundle that never configures", async () => {
		const bundle = await bundlers.esbuild({ cwd: app })
		attest(
			[writtenConfigMessage, "[object Date]"].filter(text =>
				bundle.includes(text)
			)
		).equals([])
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
			"pass a hole of another kind in a definition folded to what it throws",
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
