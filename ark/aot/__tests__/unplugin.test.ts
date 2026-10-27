import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	emitDeclarations,
	writeDeclareFrameworkMessage,
	writeDeclaredOutsideMessage
} from "@ark/aot/internal/declare.ts"
import {
	withAllowUnsafe,
	unbundledMessage,
	writeExternalizedMessage,
	writeFilelessImportMessage,
	writeLoadedFirstMessage,
	writePrecompiledDependencyMessage,
	writeUncachedModuleMessage,
	writeUntransformedImportMessage,
	writeUnwrittenModuleMessage
} from "@ark/aot/internal/host.ts"
import { writeStandaloneDependencyMessage } from "@ark/aot/internal/messages.ts"
import {
	writeEntryHelperMessage,
	writeUntransformedHelperMessage
} from "@ark/aot/internal/scan.ts"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import {
	context,
	build as esbuild,
	transformSync,
	type BuildOptions,
	type Plugin
} from "esbuild"
import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { isAbsolute, join, relative, sep } from "node:path"
import { stripVTControlCharacters } from "node:util"
import { Worker } from "node:worker_threads"
import { rollup, type Plugin as RollupPlugin } from "rollup"
import {
	createBuilder,
	createServer,
	createServerModuleRunner,
	build as viteBuild,
	defaultClientConditions,
	defaultServerConditions,
	normalizePath,
	type InlineConfig,
	type Plugin as VitePlugin,
	type Rolldown
} from "vite"
import { rspack } from "@rspack/core"
import { startVitest } from "vitest/node"
import webpack, { type Stats } from "webpack"
import { configureAfterTypeMessage } from "@ark/schema"
import {
	writeCreatedBeforeConfigureMessage,
	writtenConfigMessage
} from "@ark/schema/runtime"
import { bakedJsonSchemaOptionsMessage } from "arktype/runtime"
import {
	packageFiles,
	run,
	runBundle,
	runPlain,
	tempDir,
	undetailedOutput,
	writeFixture,
	writeLibrary,
	writeUndetailed
} from "./utils.ts"

const app = fromHere("app")
const configured = fromHere("configured")
const firstConfigured = fromHere("firstConfigured")
const messaged = fromHere("messaged")
const mutatingConfigured = fromHere("mutatingConfigured")
const library = writeLibrary()
const undetailed = writeUndetailed()

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

const viteConfig = (
	opts?: PrecompileUnpluginOptions,
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

const restoreNodeEnv = (env: string | undefined) => {
	if (env === undefined) delete process.env.NODE_ENV
	else process.env.NODE_ENV = env
}

// Vite reads its mode from NODE_ENV, which its first run in a process sets
const withNodeEnv = async <t>(env: string, run: () => Promise<t>) => {
	const { NODE_ENV } = process.env
	process.env.NODE_ENV = env
	try {
		return await run()
	} finally {
		restoreNodeEnv(NODE_ENV)
	}
}

const runVitest = async (
	root: string,
	opts: PrecompileUnpluginOptions,
	env: Record<string, string> = {}
) => {
	const vitest = await startVitest(
		[],
		{
			root,
			config: false,
			watch: false,
			reporters: [],
			testTimeout: 60_000,
			env
		},
		viteConfig(opts, root)
	)
	await vitest.close()
	return vitest.state
}

// how many of a run's tests failed and passed
const outcomesOf = (state: Awaited<ReturnType<typeof runVitest>>) => ({
	failed: state.getCountOfFailedTests(),
	passed: state
		.getFiles()
		.flatMap(file => file.tasks)
		.filter(task => task.result?.state === "pass").length
})

const bundlers = {
	vite: async (opts?: PrecompileUnpluginOptions, root = app) => {
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
	esbuild: async (
		opts?: PrecompileUnpluginOptions,
		root = app,
		minify = true
	) => {
		const { outputFiles } = await esbuild({
			entryPoints: [join(root, "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			minify,
			conditions,
			logLevel: "silent",
			plugins: opts ? [precompile.esbuild({ ...opts, conditions })] : []
		})
		return outputFiles[0].text
	}
}

interface RawHooks {
	webpack(compiler: {
		options: {
			cache: object | false
			mode?: string
			module: { rules: object[] }
		}
		hooks: { compilation: { tap(): void } }
	}): void
	resolveId: {
		handler(
			this: object,
			id: string,
			importer: string
		): Promise<string | undefined>
	}
	transform: {
		handler(this: object, code: string, id: string): Promise<{ code: string }>
	}
	load: { handler(id: string): string | undefined }
}

// each thread a process starts takes the next id
const nextThreadId = () => {
	const worker = new Worker("", { eval: true })
	void worker.terminate()
	return worker.threadId
}

// a minified class prints its error's name, as `ce [ParseError]: `
const thrownBy = (js: string) =>
	/^(?:[\w$]+ \[)?\w*Error]?: (.*)$/m.exec(runBundle(js).stderr)?.[1]

const fakePackage = (
	path: string,
	name: string,
	version: string,
	manifest: object = {}
) =>
	packageFiles(
		name,
		{
			"index.js":
				"export const type = () => {}\nexport class ArkErrors {}\nexport const registerPrecompiledUnits = () => {}\n"
		},
		{
			version,
			...manifest,
			exports: {
				".": "./index.js",
				"./runtime": "./index.js",
				"./internal": "./index.js",
				"./*": "./*"
			}
		},
		path
	)

// the versions the precompiler runs on
const versionOf = (dir: string): string =>
	JSON.parse(readFileSync(fromHere("..", "..", dir, "package.json"), "utf8"))
		.version
const arktypeVersion = versionOf("type")
const schemaVersion = versionOf("schema")

// declarations are keyed by TypeScript's paths, which use / on Windows too
const tsPath = (path: string) => path.split(sep).join("/")

// where a package the precompiler runs on is, from the program's root, as
// messages print it
const ownPath = (dir: string) =>
	relative(dependencies, fromHere("..", "..", dir))
		.split(sep)
		.join("/")

const versionHint =
	"A precompiled validator is written for the arktype it was built with. Install one version of each, so @ark/aot imports what the program does."

// a program whose packages import arktype, one of them from a copy of its own
const dependencyFiles = {
	...fakePackage("node_modules/arktype", "arktype", arktypeVersion),
	...fakePackage(
		"node_modules/arktype/node_modules/@ark/schema",
		"@ark/schema",
		schemaVersion
	),
	...fakePackage("node_modules/@ark/schema", "@ark/schema", "0.1.0"),
	...fakePackage("node_modules/shared", "shared", "1.0.0"),
	"node_modules/shared/index.js":
		'import { type } from "arktype"\nexport const shared = typeof type\n',
	"node_modules/shared/other.js":
		'import { type } from "arktype"\nexport const other = typeof type\n',
	// as @hono/arktype-validator, which reads only `type.errors`
	...fakePackage("node_modules/adapter", "adapter", "1.0.0"),
	"node_modules/adapter/index.js":
		'import { type, ArkErrors } from "arktype"\nexport const failed = out => out instanceof type.errors || out instanceof ArkErrors\nexport const shadowed = type => type.string\n',
	"adapter.ts":
		'import { failed, shadowed } from "adapter"\nconsole.log(failed, shadowed)\n',
	...fakePackage("node_modules/forked", "forked", "1.0.0"),
	...fakePackage(
		"node_modules/forked/node_modules/arktype",
		"arktype",
		"2.1.0"
	),
	"node_modules/forked/index.js":
		'import { type } from "arktype"\nexport const forked = typeof type\n',
	// a workspace that upgraded arktype without @ark/aot
	...fakePackage("upgraded/node_modules/arktype", "arktype", "9.0.0", {
		arkAotVersion: "9.1.0"
	}),
	"upgraded/main.ts":
		'import { type } from "arktype"\nexport const T = type("string")\n',
	...fakePackage("node_modules/prebuilt", "prebuilt", "1.0.0"),
	"node_modules/prebuilt/index.js":
		'import { registerPrecompiledUnits } from "arktype/runtime"\nexport const prebuilt = typeof registerPrecompiledUnits\n',
	"node_modules/prebuilt/other.js":
		'import { registerPrecompiledUnits } from "arktype/runtime"\nexport const other = typeof registerPrecompiledUnits\n',
	"prebuilt.ts":
		'import { prebuilt } from "prebuilt"\nimport { other } from "prebuilt/other.js"\nconsole.log(prebuilt, other)\n',
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
	opts: PrecompileUnpluginOptions = {}
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
	const relativeTo = (messages: { text: string }[]) =>
		messages.map(({ text }) => text.split(`${dependencies}/`).join(""))
	return {
		errors: relativeTo(result.errors),
		warnings: "warnings" in result ? relativeTo(result.warnings) : []
	}
}

// written while parsing a definition, which a standalone build never does
const parserMessage = "is unresolvable"

const cycles: Record<string, PrecompileUnpluginOptions["members"]> = {
	cycle: undefined,
	cycleFirst: { expression: true, json: true },
	cycleArrow: { json: true },
	// throws a ParseError, as arktype does, so its builds allow it
	setInStep: { expression: true }
}

contextualize(function (this: Mocha.Suite) {
	this.timeout(60_000)

	before(() => {
		dependencies = writeFixture(dependencyFiles)
	})

	// so the processes later suites spawn don't inherit the mode a build set
	const { NODE_ENV } = process.env
	after(() => restoreNodeEnv(NODE_ENV))

	const expected = runPlain(app)

	for (const [name, bundle] of Object.entries(bundlers)) {
		it(`${name} standalone or cache`, async () => {
			const withArktype = await bundle()
			const standalone = await bundle({})
			attest(run(standalone)).equals(expected)
			attest([
				withArktype.includes(parserMessage),
				standalone.includes(parserMessage)
			]).equals([true, false])
			attest(run(await bundle({ runtime: "arktype" }))).equals(expected)
		})

		it(`${name} configured`, async () => {
			const opts = { cwd: configured, config: "config.ts" }
			const standalone = await bundle(opts, configured)
			attest(run(standalone)).equals(runPlain(configured))
			attest(standalone.includes(parserMessage)).equals(false)
			attest(
				run(await bundle({ ...opts, runtime: "arktype" }, configured))
			).equals(runPlain(configured))
			attest(
				run(await bundle({ cwd: messaged, config: "config.ts" }, messaged))
			).equals(runPlain(messaged))
		})
	}

	// a production build doesn't check a read precedes what it reads
	for (const minify of [true, false]) {
		it(`esbuild ${minify ? "" : "unminified "}import cycles`, async () => {
			for (const [fixture, members] of Object.entries(cycles)) {
				const root = fromHere(fixture)
				const opts = { cwd: root, members, allowUnsafe: true }
				attest(
					run(
						await bundlers.esbuild(
							minify ? { ...opts, creationChecks: "types" } : opts,
							root,
							minify
						)
					)
				).equals(runPlain(root))
			}
		})
	}

	it("esbuild runtime islands", async () => {
		const islands = fromHere("islands")
		const standalone = await bundlers.esbuild(
			{ cwd: islands, config: "config.ts" },
			islands
		)
		attest(run(standalone)).equals(runPlain(islands))
		attest(standalone.includes(parserMessage)).equals(true)
	})

	it("esbuild packages that opt in", async () => {
		const standalone = await bundlers.esbuild({ cwd: library }, library)
		attest(run(standalone)).equals(runPlain(library))
		attest(standalone.includes(parserMessage)).equals(false)
	})

	it("esbuild static introspection", async () => {
		const introspected = fromHere("introspected")
		const standalone = await bundlers.esbuild(
			{ cwd: introspected, members: { toJsonSchema: true } },
			introspected
		)
		attest(run(standalone)).equals(runPlain(introspected))
	})

	it("esbuild ignores a library's fallback where no fallback writes the schema", async () => {
		const root = writeFixture(
			{
				// as hono-openapi and @orpc/arktype convert a Type they're passed
				"main.ts": `import { type } from "arktype"

const User = type({ name: "string", "tags?": "string[]" })
const Event = type({ at: "Date" })

const convert = (t: typeof User | typeof Event, opts: object) => {
	try {
		return t.toJsonSchema(opts)
	} catch (e) {
		return String(e)
	}
}

const date = { date: (ctx: { base: object }) => ({ ...ctx.base, format: "date-time" }) }

console.log(
	JSON.stringify([
		convert(User, { fallback: (ctx: { base: object }) => ctx.base }),
		convert(User, { fallback: date }),
		convert(Event, { fallback: date })
	])
)
`
			},
			fromHere("temp", "fallback")
		)
		const standalone = await bundlers.esbuild(
			{ cwd: root, members: { toJsonSchema: true } },
			root
		)
		const [ignored, ignoredWithDate, needed] = JSON.parse(run(standalone))
		const [user, userWithDate, event] = JSON.parse(runPlain(root))
		attest([ignored, ignoredWithDate]).equals([user, userWithDate])
		attest(event.properties.at).equals({ format: "date-time" })
		attest(needed).equals(`Error: ${bakedJsonSchemaOptionsMessage}`)
	})

	it("esbuild writes no NUL into its output", async () => {
		const standalone = await bundlers.esbuild({}, app, false)
		attest(standalone.includes("~arktype/")).equals(true)
		attest(standalone.includes("\0")).equals(false)
	})

	it("vite standalone for SSR", async () => {
		const config = viteConfig({})
		const { output } = (await viteBuild({
			...config,
			ssr: { ...config.ssr, noExternal: true },
			build: { write: false, ssr: "main.ts" }
		})) as Rolldown.RolldownOutput
		attest(run(output[0].code)).equals(expected)
	})

	it("vite's development server and module runner", async () => {
		const root = writeFixture({
			"main.ts": `import { type } from "arktype"
import { inspect } from "node:util"

export const User = type({ a: "string" })
export const isErrors = User({ a: 1 }) instanceof type.errors
export const inspected = inspect(User({ a: 1 }))
export let thrown = ""
try {
	User.assert({ a: 1 })
} catch (e) {
	thrown = String(e)
}
export const describe = (t: { description: string }) => t.description
`
		})
		// a dependency Vite would otherwise leave to Node, as an installed one is
		mkdirSync(join(root, "node_modules"))
		symlinkSync(
			fromHere("..", "..", "type"),
			join(root, "node_modules/arktype")
		)
		const results: unknown[] = []
		for (const opts of [
			{ members: { expression: true } },
			{ errors: "none" }
		] as const) {
			const config = viteConfig(opts, root)
			const server = await withNodeEnv("development", () =>
				createServer({
					...config,
					resolve: { ...config.resolve, preserveSymlinks: true },
					ssr: { resolve: { ...config.ssr!.resolve, externalConditions: [] } }
				})
			)
			const runner = createServerModuleRunner(server.environments.ssr)
			try {
				const { User, isErrors, inspected, thrown, describe } =
					await runner.import("/main.ts")
				let unbaked = ""
				try {
					describe(User)
				} catch (e) {
					unbaked = (e as Error).message
				}
				results.push([isErrors, inspected, thrown, unbaked])
			} finally {
				await runner.close()
				await server.close()
			}
		}
		attest(results).snap([
			[
				true,
				"[\n  {\n    code: 'domain',\n    path: [ 'a' ],\n    data: 1,\n    expected: 'a string',\n    message: 'a must be a string'\n  }\n]",
				"TraversalError: a must be a string",
				'description isn\'t baked into this validator. Set members.description true, or build with runtime: "arktype".'
			],
			[
				true,
				"[\n  {\n    code: 'predicate',\n    path: [],\n    data: { a: 1 },\n    message: 'is invalid'\n  }\n]",
				"Error: is invalid",
				'description isn\'t baked into this validator. Set members.description true, or build with runtime: "arktype".'
			]
		])
	})

	it("vite's development server rewrites the importers of a changed Type", async () => {
		const page = (max: number) =>
			`import { type } from "arktype"\n\nexport const Page = type({ n: "number <= ${max}" })\n`
		const root = writeFixture({
			"page.ts": page(1),
			"search.ts": `import { type } from "arktype"
import { Page } from "./page.ts"

export const Search = type({ q: "string" }).and(Page)
`,
			"main.ts": `import { type } from "arktype"
import { Search } from "./search.ts"

export const allows = (n: number) => !(Search({ q: "", n }) instanceof type.errors)
`
		})
		mkdirSync(join(root, "node_modules"))
		symlinkSync(
			fromHere("..", "..", "type"),
			join(root, "node_modules/arktype")
		)
		const config = viteConfig({}, root)
		const server = await withNodeEnv("development", () =>
			createServer({
				...config,
				resolve: { ...config.resolve, preserveSymlinks: true },
				ssr: { resolve: { ...config.ssr!.resolve, externalConditions: [] } }
			})
		)
		const runner = createServerModuleRunner(server.environments.ssr, {
			hmr: false
		})
		try {
			const before = (await runner.import("/main.ts")).allows(2)
			const file = join(root, "page.ts")
			writeFileSync(file, page(2))
			// Vite's id for a file, which writes / on Windows
			const pageModule = server.environments.ssr.moduleGraph.getModuleById(
				normalizePath(file)
			)!
			server.watcher.emit("change", file)
			for (let waited = 0; pageModule.transformResult; waited += 10) {
				if (waited > 10_000) throw new Error("page.ts was never invalidated")
				await new Promise(resolve => setTimeout(resolve, 10))
			}
			runner.clearCache()
			attest([before, (await runner.import("/main.ts")).allows(2)]).equals([
				false,
				true
			])
		} finally {
			await runner.close()
			await server.close()
		}
	})

	it("fails a build whose external option takes arktype from the bundle", async () => {
		const thrownBy = (build: () => Promise<unknown>) =>
			build().then(
				() => "built",
				(e: Error) => stripVTControlCharacters(e.message)
			)
		const config = viteConfig({})
		attest([
			await thrownBy(() =>
				viteBuild({
					...config,
					build: {
						write: false,
						lib: { entry: "main.ts", formats: ["es"] },
						rolldownOptions: { external: id => id === "arktype" }
					}
				})
			),
			await thrownBy(async () =>
				(
					await createServer({
						...config,
						ssr: { ...config.ssr, external: ["@ark/schema"] }
					})
				).close()
			)
		]).equals([
			withAllowUnsafe(writeExternalizedMessage("arktype", "external")),
			withAllowUnsafe(writeExternalizedMessage("@ark/schema", "ssr.external"))
		])
	})

	it("vite builds the same bundle from a cache an earlier build left", async () => {
		const cacheDir = tempDir()
		const build = async () => {
			const [{ output }] = (await withNodeEnv("production", () =>
				viteBuild({
					...viteConfig({}),
					cacheDir,
					build: {
						write: false,
						minify: true,
						lib: { entry: "main.ts", formats: ["es"] }
					}
				})
			)) as Rolldown.RolldownOutput[]
			return output[0].code
		}
		const first = await build()
		attest(await build()).equals(first)
		attest(run(first)).equals(expected)
	})

	it("vite emits declarations", async () => {
		const declared = fromHere("declared")
		const [{ output }] = (await viteBuild({
			...viteConfig({ cwd: declared, declare: true }, declared),
			build: {
				write: false,
				lib: { entry: "src/index.ts", formats: ["es"] }
			}
		})) as Rolldown.RolldownOutput[]
		const assets = output.filter(file => file.type === "asset")
		attest(assets.map(file => file.fileName).sort()).snap([
			"aliases.d.ts",
			"common.d.ts",
			"cycles.d.ts",
			"enums.d.ts",
			"index.d.ts",
			"nested/augments.d.ts",
			"nested/base.d.ts",
			"node.d.ts",
			"scoped.d.ts",
			"shapes.d.ts",
			"users.d.ts",
			"~arktype.d.ts"
		])
		attest(
			assets.find(file => file.fileName === "~arktype.d.ts")?.source
		).equals(
			emitDeclarations({ cwd: declared }).files[
				tsPath(join(declared, "out", "~arktype.d.ts"))
			]
		)
	})

	// TypeScript's diagnostics for this tsconfig, warned where declarations emit
	const warnedDeclaring = async (
		declare: (config: InlineConfig) => unknown
	) => {
		const layouts = fromHere("declaredLayouts")
		const config = viteConfig(
			{ cwd: layouts, declare: true, tsconfig: "tsconfig.broken.json" },
			layouts
		)
		const warnings: unknown[] = []
		const { warn } = console
		console.warn = (...args: unknown[]) => warnings.push(args)
		try {
			await declare(config)
		} finally {
			console.warn = warn
		}
		return warnings
	}

	it("vite emits no declarations while serving or watching", async () => {
		attest(
			await warnedDeclaring(async config =>
				(await createServer(config)).close()
			)
		).equals([])
		attest(
			await warnedDeclaring(async config => {
				const watcher = (await viteBuild({
					...config,
					build: {
						write: false,
						watch: {},
						lib: { entry: "src/index.ts", formats: ["es"] }
					}
				})) as Rolldown.RolldownWatcher
				await new Promise(resolve =>
					watcher.on("event", event => {
						if (event.code === "END" || event.code === "ERROR") resolve(event)
					})
				)
				await watcher.close()
			})
		).equals([])
	})

	it("vite declares once for an app's environments", async () => {
		const warnings = await warnedDeclaring(async config => {
			const builder = await createBuilder({
				...config,
				environments: {
					client: {
						build: { write: false, rollupOptions: { input: "src/index.ts" } }
					},
					ssr: { build: { write: false, ssr: "src/index.ts" } }
				},
				builder: {}
			})
			await builder.buildApp()
		})
		attest(warnings.length).equals(1)
	})

	it("vite refuses declarations outside the bundle", async () => {
		const layouts = fromHere("declaredLayouts")
		const message = await viteBuild({
			...viteConfig(
				{ cwd: layouts, declare: true, tsconfig: "tsconfig.outside.json" },
				layouts
			),
			build: { write: false, lib: { entry: "src/index.ts", formats: ["es"] } }
		}).then(
			() => "",
			(e: Error) => e.message
		)
		attest(
			message.includes(
				writeDeclaredOutsideMessage(
					tsPath(join(layouts, "src", "index.d.ts")),
					tsPath(join(layouts, "out"))
				)
			)
		).equals(true)
	})

	it("esbuild refuses declare", () => {
		attest(() => precompile.esbuild({ declare: true })).throws(
			writeDeclareFrameworkMessage("esbuild")
		)
	})

	it("esbuild refuses a build that doesn't bundle", async () => {
		const errors = await esbuild({
			entryPoints: [join(app, "main.ts")],
			write: false,
			logLevel: "silent",
			plugins: [precompile.esbuild({ cwd: app, conditions })]
		}).then(
			() => [],
			(e: { errors: { text: string }[] }) => e.errors.map(error => error.text)
		)
		attest(errors).equals([unbundledMessage])
	})

	it("reports the lines of a module a plugin ahead of it transpiled", async () => {
		const root = writeFixture({
			"main.ts": `import { type } from "arktype"

interface Settings {
	limit: number
}

const settings: Settings = { limit: Math.random() }

export const User = type({ name: \`string <= \${settings.limit}\` })
`
		})
		// loads TypeScript as JavaScript, as Rollup's TypeScript plugin does
		const transpile = {
			name: "transpile",
			load: (id: string) => {
				if (!id.endsWith(".ts")) return
				const { code, map } = transformSync(readFileSync(id, "utf8"), {
					loader: "ts",
					sourcemap: "external",
					sourcefile: id
				})
				return { code, map }
			}
		}
		const message = await viteBuild({
			...viteConfig({ cwd: root }, root),
			plugins: [transpile, precompile.vite({ cwd: root, conditions })],
			build: { write: false, lib: { entry: "main.ts", formats: ["es"] } }
		}).then(
			() => "",
			(e: Error) => e.message
		)
		// what the plugin threw, after Vite's header naming the module, which
		// Vite colors where it detects a CI
		attest(stripVTControlCharacters(message).split("\nError: ")[1])
			.snap(`main.ts:9:21  type({ name: \`string <= \${settings.limit}\` }) cannot be precompiled
  \`settings\` is \`{ limit: Math.random() }\` (main.ts:7:7)
  \`Math.random\` is not one of the build's pure built-ins
  Replace \`Math.random()\` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.`)
	})

	// a list that grew with the build made a 100-module build 15 times slower
	it("esbuild watches each module's own imports, once", async () => {
		const count = 30
		const files: Record<string, string> = {
			"main.ts": `export * from "./m${count - 1}.ts"\n`
		}
		for (let i = 0; i < count; i++) {
			files[`m${i}.ts`] =
				i === 0 ?
					'import { type } from "arktype"\n\nexport const T0 = type({ a: "string" })\n'
				:	`import { type } from "arktype"\nimport { T${i - 1} } from "./m${i - 1}.ts"\n\nexport const T${i} = type({ a: "string", prev: T${i - 1}.pick("a") })\n`
		}
		const root = writeFixture(files, fromHere("temp", "watchedChain"))
		const plugin = precompile.esbuild({ cwd: root, conditions })
		const watchedBy: Record<string, string[]> = {}
		const record = (path: string, watchFiles: string[] = []) => {
			const watched = watchFiles.filter(file => file.startsWith(root))
			if (watched.length) {
				;(watchedBy[relative(root, path)] ??= []).push(
					...watched.map(file => relative(root, file))
				)
			}
		}
		await esbuild({
			entryPoints: [join(root, "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			conditions,
			logLevel: "silent",
			plugins: [
				{
					name: plugin.name,
					setup: build =>
						plugin.setup({
							...build,
							onResolve: (options, callback) =>
								build.onResolve(options, async args => {
									const result = await callback(args)
									record(`resolved ${args.path}`, result?.watchFiles)
									return result
								}),
							onLoad: (options, callback) =>
								build.onLoad(options, async args => {
									const result = await callback(args)
									record(args.path, result?.watchFiles)
									return result
								})
						})
				}
			]
		})
		attest(watchedBy["m3.ts"]).equals(["m2.ts", "m1.ts", "m0.ts"])
		const closureOf = (file: string) =>
			Array.from({ length: Number(file.slice(1, -3)) }, (_, i) => `m${i}.ts`)
		attest(
			Object.entries(watchedBy).filter(
				([file, watched]) =>
					[...watched].sort().join() !== closureOf(file).sort().join()
			)
		).equals([])
		attest(Object.keys(watchedBy).length).equals(count - 1)
	})

	it("esbuild rebuilds what reads a changed Type", async () => {
		const max = (n: number) =>
			`import { type } from "arktype"\n\nexport const Max = type("number <= ${n}")\n`
		const root = writeFixture(
			{
				"max.ts": max(1),
				"limited.ts": `import { type } from "arktype"
import { Max } from "./max.ts"

export const Limited = type({ n: Max })
`,
				"other.ts": `import { type } from "arktype"

export const Other = type({ s: "string" })
`,
				"main.ts": `import { type } from "arktype"
import { Limited } from "./limited.ts"
import { Other } from "./other.ts"

console.log(Limited({ n: 2 }) instanceof type.errors, Other({ s: "" }) instanceof type.errors)
`
			},
			fromHere("temp", "rebuilt")
		)
		const ctx = await context({
			entryPoints: [join(root, "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			conditions,
			logLevel: "silent",
			plugins: [precompile.esbuild({ cwd: root, conditions })]
		})
		try {
			const outputs = [run((await ctx.rebuild()).outputFiles![0].text)]
			// kept from the first build, until a file it was precompiled from changes
			writeFileSync(join(root, "max.ts"), max(2))
			outputs.push(run((await ctx.rebuild()).outputFiles![0].text))
			attest(outputs).equals(["true false\n", "false false\n"])
		} finally {
			await ctx.dispose()
		}
	})

	it("keeps a configured worker until its config changes", async () => {
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
	})

	it("fails once per dependency importing arktype, or warns with allowUnsafe", async () => {
		const shared = writeStandaloneDependencyMessage("shared")
		const prebuilt = writePrecompiledDependencyMessage("prebuilt")
		attest(await buildDependency("shared.ts")).equals({
			errors: [shared],
			warnings: []
		})
		attest(await buildDependency("prebuilt.ts")).equals({
			errors: [withAllowUnsafe(prebuilt)],
			warnings: []
		})
		attest(await buildDependency("shared.ts", { runtime: "arktype" })).equals({
			errors: [],
			warnings: []
		})
		attest(await buildDependency("shared.ts", { allowUnsafe: true })).equals({
			errors: [],
			warnings: [shared]
		})
		attest(await buildDependency("prebuilt.ts", { allowUnsafe: true })).equals({
			errors: [],
			warnings: [prebuilt]
		})
	})

	it("precompiles a dependency the program's settings name", async () => {
		const root = writeFixture(
			{
				"package.json": '{ "type": "module" }',
				...packageFiles("untagged", {
					"index.js":
						'import { type } from "arktype"\n\nexport const Tagged = type({ tag: "string" })\n',
					"index.d.ts":
						'export declare const Tagged: import("arktype").Type<{ tag: string }>\n'
				}),
				"main.ts": readFileSync(join(library, "main.ts"), "utf8").replace(
					'from "tagged"',
					'from "untagged"'
				)
			},
			fromHere("temp", "untagged")
		)
		const refused = await bundlers
			.esbuild({ cwd: root }, root)
			.catch((e: { errors: { text: string }[] }) => e.errors[0].text)
		attest(refused).equals(writeStandaloneDependencyMessage("untagged"))
		const standalone = await bundlers.esbuild(
			{ cwd: root, dependencies: { untagged: "aot" } },
			root
		)
		attest(run(standalone)).equals(runPlain(library))
		attest(standalone.includes(parserMessage)).equals(false)
	})

	it("runs a dependency the program's settings name on arktype", async () => {
		const root = writeFixture(
			{
				"package.json": '{ "type": "module" }',
				// as drizzle-arktype creates Types from tables
				...packageFiles("tables", {
					"index.js":
						'import { type } from "arktype"\n\nexport const typeOf = columns => type(Object.fromEntries(columns.map(c => [c, "string"])))\n',
					"index.d.ts":
						'export declare const typeOf: (columns: string[]) => import("arktype").Type<Record<string, string>>\n'
				}),
				"config.ts":
					'import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "delete" })\n',
				"main.ts": `import "./config.ts"
import { type } from "arktype"
import { typeOf } from "tables"

const Row = typeOf(["name"])
const Email = type({ email: "string.email" })

const failed = [Row({ name: 1 }), Email({ email: "x" })]
console.log(
	JSON.stringify([
		Row({ name: "Ada", extra: 1 }),
		failed.map(out => out instanceof type.errors && out.summary),
		(await Row["~standard"].validate({})).issues?.map(issue => issue.message)
	])
)
`
			},
			fromHere("temp", "tables")
		)
		const opts = {
			cwd: root,
			config: "config.ts",
			dependencies: { tables: "arktype" }
		} as const
		const expected = runPlain(root)
		attest(JSON.parse(expected)).snap([
			{ name: "Ada" },
			[
				"name must be a string (was a number)",
				'email must be an email address (was "x")'
			],
			["must be a string (was missing)"]
		])
		// the dependency's Types are arktype's, and only Email is precompiled
		const precompiled = (out: string) => out.replace(' (was \\"x\\")', "")
		for (const bundle of [
			await bundlers.esbuild(opts, root),
			await withNodeEnv("production", () => bundlers.vite(opts, root))
		])
			attest(run(bundle)).equals(precompiled(expected))
	})

	it("builds a dependency reading only what arktype's runtime exports", async () => {
		attest(await buildDependency("adapter.ts")).equals({
			errors: [],
			warnings: []
		})
	})

	it("names a Vite plugin ahead of it that transforms the config module", async () => {
		const root = writeFixture(
			{
				"config.ts":
					'import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "delete" })\n',
				"main.ts":
					'import "./config.ts"\nimport { type } from "arktype"\n\nexport const User = type({ name: "string" })\n'
			},
			fromHere("temp", "transformedConfig")
		)
		const rewrite: VitePlugin = {
			name: "rewrite-config",
			enforce: "pre",
			transform: (code, id) =>
				id.endsWith("config.ts") ? code.replace("delete", "reject") : undefined
		}
		const build = (plugins: (VitePlugin | VitePlugin[])[]) =>
			viteBuild({
				...viteConfig(undefined, root),
				plugins,
				build: { write: false, lib: { entry: "main.ts", formats: ["es"] } }
			}).then(
				() => "built",
				(e: Error) => {
					const message = stripVTControlCharacters(e.message)
					// main.ts's error about the same configuration may race in after it
					return message
						.slice(message.indexOf("config.ts:"))
						.split("\n[plugin ")[0]
				}
			)
		const arktype = precompile.vite({ config: "config.ts", conditions })
		attest(await build([rewrite, arktype]))
			.snap(`config.ts:3:1  configure() is given other values than arktype in this thread already applied
  a module the configuration reads was given anew, as when it's edited while the build runs or a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set
  Restart the build to apply an edit to config.ts. If it wasn't edited, put arktype's plugin ahead of rewrite-config, which transforms it.`)
		attest(
			await build([
				precompile.vite({ config: "config.ts", conditions }),
				rewrite
			])
		).equals("built")
	})

	it("fails where a module it can't precompile imports arktype", async () => {
		const root = writeFixture(
			{
				"Form.svelte":
					'<script>\nimport { type } from "arktype"\nexport const Login = type({ user: "string" })\n</script>\n',
				"main.js": 'import { Login } from "./Form.svelte"\nconsole.log(Login)\n'
			},
			fromHere("temp", "untransformed")
		)
		// loads a component's script, as Svelte's plugin compiles it
		const svelte: Plugin = {
			name: "svelte",
			setup: build =>
				build.onLoad({ filter: /\.svelte$/ }, args => ({
					contents: /<script>([\S\s]*)<\/script>/.exec(
						readFileSync(args.path, "utf8")
					)![1],
					loader: "js"
				}))
		}
		const build = (allowUnsafe?: true) =>
			esbuild({
				entryPoints: [join(root, "main.js")],
				bundle: true,
				write: false,
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [
					precompile.esbuild({ cwd: root, conditions, allowUnsafe }),
					svelte
				]
			}).catch((e: { errors: { text: string }[] }) => e)
		const message = writeUntransformedImportMessage(
			join(root, "Form.svelte"),
			"arktype",
			root
		)
		attest((await build()).errors.map(error => error.text)).snap([
			"Form.svelte imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws, as it can't precompile a module that isn't JavaScript or TypeScript. Move what it reads off arktype into a .ts module it imports: define its Types there, and check for errors with a function exported from there, like `export const isInvalid = (out: unknown) => out instanceof type.errors`."
		])
		const unsafe = await build(true)
		attest("warnings" in unsafe && unsafe.warnings.map(w => w.text)).equals([
			message
		])
	})

	describe("an import only the bundler resolves", () => {
		// an alias in the bundler's config alone, as Nuxt's #shared without
		// the tsconfig.json that would name it, imported from JavaScript, which
		// the repo's typecheck skips
		const root = writeFixture(
			{
				"shared/types.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
				"main.js":
					'import { User } from "#shared/types"\n\nconsole.log(String(User.errors))\n',
				"allows.js":
					'import { User } from "#shared/types"\n\nconsole.log(User.allows({ name: "Ada" }))\n',
				"Form.svelte": "<script>\n</script>\n",
				"form.js": 'import read from "./Form.svelte"\n\nconsole.log(read)\n',
				// an alias to arktype, which the bundler resolves through this
				// plugin while the precompiler waits on its answer
				"validation.js":
					'import { type } from "#validation"\n\nconst User = type({ name: "string" })\n\nconsole.log(User.allows({ name: "Ada" }))\n',
				// read as the build starts, before a module asks the bundler
				"config.js":
					'import { configure } from "arktype/config"\nimport { describe } from "#shared/describe"\n\nconfigure({ domain: { description: describe } })\n',
				"shared/describe.ts": 'export const describe = () => "a numeral"\n'
			},
			fromHere("temp", "aliased")
		)
		const shared = join(root, "shared")
		const failure =
			"main.js:3:20  User.errors reads errors, which a standalone validator lacks"

		it("vite", async () => {
			// compiles a component reading User.errors, as Svelte's does
			const svelte: VitePlugin = {
				name: "svelte",
				enforce: "pre",
				transform: (_, id) =>
					id.endsWith(".svelte") ?
						'import { User } from "#shared/types"\n\nexport default String(User.errors)\n'
					:	undefined
			}
			const config = viteConfig(undefined, root)
			const build = (entry: string, opts?: PrecompileUnpluginOptions) =>
				viteBuild({
					...config,
					plugins: [
						svelte,
						precompile.vite({ ...opts, cwd: root, conditions })
					],
					resolve: {
						...config.resolve,
						alias: [
							{ find: /^#shared\//, replacement: `${shared}/` },
							{ find: /^#validation$/, replacement: "arktype" }
						]
					},
					build: { write: false, lib: { entry, formats: ["es"] } }
				}).then(
					() => [],
					(e: { errors?: Error[] } & Error) =>
						(e.errors ?? [e]).map(
							e => stripVTControlCharacters(e.message).split("\n")[0]
						)
				)
			attest(await build("allows.js")).equals([])
			attest(await build("main.js")).equals([failure])
			attest(await build("form.js")).equals([
				"Form.svelte:3:23  User.errors reads errors, which a standalone validator lacks"
			])
			attest(await build("validation.js")).equals([])
			attest(await build("allows.js", { config: "config.js" })).equals([])
		})

		it("esbuild", async () => {
			const alias: Plugin = {
				name: "alias",
				setup: build => {
					// in the file namespace, as most plugins resolve
					build.onResolve(
						{ filter: /^#shared\//, namespace: "file" },
						args => ({
							path: join(shared, `${args.path.slice("#shared/".length)}.ts`)
						})
					)
					// naming no namespace, as many plugins resolve
					build.onResolve(
						{ filter: /^#validation$/ },
						({ kind, importer, resolveDir }) =>
							build.resolve("arktype", { kind, importer, resolveDir })
					)
				}
			}
			const build = (entry: string) =>
				esbuild({
					entryPoints: [join(root, entry)],
					bundle: true,
					write: false,
					conditions,
					logLevel: "silent",
					plugins: [alias, precompile.esbuild({ cwd: root, conditions })]
				}).then(
					() => [],
					(e: { errors: { text: string }[] }) =>
						e.errors.map(e => e.text.split("\n")[0])
				)
			attest(await build("main.js")).equals([failure])
			attest(await build("validation.js")).equals([])
		})

		it("webpack", async () => {
			const compiler = webpack({
				mode: "production",
				context: root,
				entry: "./main.js",
				target: "node",
				output: { path: join(root, "out") },
				resolve: { alias: { "#shared": shared }, extensions: [".ts", ".js"] },
				plugins: [precompile.webpack({ cwd: root })]
			})
			const stats = await new Promise<Stats | undefined>((resolve, reject) =>
				compiler.run((error, stats) =>
					compiler.close(() => (error ? reject(error) : resolve(stats)))
				)
			)
			attest(
				stats?.toJson().errors?.map(error => error.message.includes(failure))
			).equals([true])
		})
	})

	it("bundles the files arktype's runtime imports where Rollup leaves dependencies to Node", async () => {
		const root = writeFixture(
			{
				"main.ts":
					'import { type } from "arktype"\n\nconst User = type({ name: "string" })\nconst out = User({ name: 5 })\n\nconsole.log(out instanceof type.errors ? out.summary : out)\n'
			},
			fromHere("temp", "leftToNode")
		)
		// leaves dependencies to Node, as Nitro's development build does, resolving
		// a relative import of one to false, whose path Rollup then writes from
		// the inputs' directory rather than the output's
		const leaving: RollupPlugin = {
			name: "leaving",
			resolveId: (specifier, importer) =>
				!importer || importer.startsWith(root) ? undefined
				: specifier.startsWith(".") ? false
				: { id: specifier, external: true }
		}
		const stripping: RollupPlugin = {
			name: "stripping",
			transform: (code, id) =>
				id.endsWith(".ts") ?
					transformSync(code, { loader: "ts" }).code
				:	undefined
		}
		const build = await rollup({
			input: join(root, "main.ts"),
			plugins: [precompile.rollup({ conditions }), leaving, stripping],
			onwarn: () => {}
		})
		const { output } = await build.generate({ format: "es" })
		attest(
			output[0].imports.filter(id => isAbsolute(id) || id.startsWith("."))
		).equals([])
		writeFileSync(join(root, "main.mjs"), output[0].code)
		attest(runPlain(root, "main.mjs")).snap("name must be a string\n")
	})

	describe("modules another plugin writes", () => {
		const root = writeFixture(
			{
				"types.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
				"Form.svelte": "<script>\n</script>\n",
				"main.js": 'import read from "./Form.svelte"\n\nconsole.log(read)\n'
			},
			fromHere("temp", "unwritten")
		)
		// compiles a component reading User as `read` does, as Svelte's does
		const svelte = (read: string): VitePlugin => ({
			name: "svelte",
			enforce: "pre",
			transform: (_, id) =>
				id.endsWith(".svelte") ?
					`import { User } from "./types.ts"\n\nexport default ${read}\n`
				:	undefined
		})
		const build = (read: string, opts: PrecompileUnpluginOptions = {}) =>
			viteBuild({
				...viteConfig(undefined, root),
				plugins: [
					svelte(read),
					precompile.vite({ cwd: root, conditions, ...opts })
				],
				build: { write: false, lib: { entry: "main.js", formats: ["es"] } }
			}).then(
				() => [],
				(e: { errors?: Error[] } & Error) =>
					(e.errors ?? [e]).map(e => stripVTControlCharacters(e.message))
			)

		it("builds one reading what a validator has", async () => {
			attest(await build('User.allows({ name: "Ada" })')).equals([])
		})

		it("fails one reading what a validator lacks, as each build checks", async () => {
			const failure = [
				"Form.svelte:3:16  User.errors reads errors, which a standalone validator lacks"
			]
			const messages = await build("User.errors")
			attest(messages.map(message => message.split("\n")[0])).equals(failure)
			for (const prune of [true, false]) {
				attest(
					(
						await withNodeEnv("production", () =>
							build("User.errors", { prune })
						)
					).map(message => message.split("\n")[0])
				).equals(failure)
			}
		})

		it("fails one reading what only a precompiled site could", async () => {
			attest(await build("User.description")).snap([
				"Form.svelte:3:16  User.description can't be precompiled in a module another plugin writes\n  the build reads Form.svelte only once another plugin has written it, so it can't write a validator there\n  Move it into a .ts or .js module of its own that this one imports, which the build precompiles, or build with runtime: \"arktype\"."
			])
		})

		it("fails a development server's", async () => {
			const server = await withNodeEnv("development", () =>
				createServer({
					...viteConfig(undefined, root),
					plugins: [
						svelte("User.errors"),
						precompile.vite({ cwd: root, conditions })
					]
				})
			)
			try {
				const message = await server.environments.client
					.transformRequest("/Form.svelte")
					.then(
						() => "",
						(e: Error) => e.message
					)
				attest(message.split("\n")[0]).equals(
					"Form.svelte:3:16  User.errors reads errors, which a standalone validator lacks"
				)
			} finally {
				await server.close()
			}
		})

		it("fails a build listing it ahead of TanStack Router's code splitter", async () => {
			const message = await viteBuild({
				...viteConfig(undefined, root),
				plugins: [
					precompile.vite({ cwd: root, conditions }),
					{
						name: "tanstack-router:code-splitter:compile-reference-file",
						enforce: "pre"
					}
				]
			}).then(
				() => "",
				(e: Error) => e.message
			)
			attest(message).snap(
				"arktype's plugin is listed ahead of TanStack Router's, which splits a route's code after arktype's precompiles it, into modules it reads unprecompiled. List precompile.vite() after tanstackRouter() in vite.config's plugins."
			)
		})
	})

	describe("fails where a module it leaves can call a helper it folds", () => {
		const root = writeFixture(
			{
				"fields.ts":
					'import { type } from "arktype"\nexport const text = (max: number) => type(`0 < string <= ${max}`)\n',
				"Form.svelte":
					'<script>\nimport { text } from "./fields.ts"\nexport const Name = text(50)\n</script>\n',
				"main.ts":
					'import { text } from "./fields.ts"\nexport const Bio = text(500)\nconsole.log(Bio)\n',
				"form.js": 'import { Name } from "./Form.svelte"\nconsole.log(Name)\n'
			},
			fromHere("temp", "unfolded")
		)
		const scriptOf = (path: string) =>
			/<script>([\S\s]*)<\/script>/.exec(readFileSync(path, "utf8"))![1]
		const untransformed = writeUntransformedHelperMessage(
			"Form.svelte",
			"fields.ts",
			"text"
		)

		it("esbuild", async () => {
			// loads a component's script, as Svelte's plugin compiles it
			const svelte: Plugin = {
				name: "svelte",
				setup: build =>
					build.onLoad({ filter: /\.svelte$/ }, args => ({
						contents: scriptOf(args.path),
						loader: "js",
						resolveDir: root
					}))
			}
			const build = (entry: string) =>
				esbuild({
					entryPoints: [join(root, entry)],
					bundle: true,
					write: false,
					format: "esm",
					conditions,
					logLevel: "silent",
					plugins: [precompile.esbuild({ cwd: root, conditions }), svelte]
				}).then(
					() => [],
					(e: { errors: { text: string }[] }) => e.errors.map(e => e.text)
				)
			attest(await build("main.ts")).equals([])
			attest(await build("form.js")).equals([untransformed])
			attest(await build("fields.ts")).equals([
				writeEntryHelperMessage("fields.ts", "text")
			])
		})

		it("vite", async () => {
			const build = (input: string) =>
				viteBuild({
					...viteConfig(undefined, root),
					plugins: [
						precompile.vite({ cwd: root, conditions }),
						{
							name: "svelte",
							load: id => (id.endsWith(".svelte") ? scriptOf(id) : undefined)
						}
					],
					build: {
						write: false,
						rollupOptions: { input: join(root, input) }
					}
				}).then(
					() => [],
					(e: { errors?: Error[]; message: string }) =>
						e.errors?.map(e => e.message) ?? [e.message]
				)
			attest(await build("main.ts")).equals([])
			// the plugin reading what others write refuses the call first
			attest(await build("form.js")).equals([
				"Form.svelte:3:21  text(50) can't be precompiled in a module another plugin writes\n  the build reads Form.svelte only once another plugin has written it, so it can't write a validator there\n  Move it into a .ts or .js module of its own that this one imports, which the build precompiles, or build with runtime: \"arktype\"."
			])
		})

		const compilers = {
			webpack: [webpack, precompile.webpack],
			Rspack: [rspack, precompile.rspack]
		} as const
		const loaded = writeFixture(
			{
				"fields.js":
					'import { type } from "arktype"\nexport const text = max => type(`0 < string <= ${max}`)\n',
				"Form.svelte":
					'<script>\nimport { text } from "./fields.js"\nexport const Name = text(50)\n</script>\n',
				"form.js": 'import { Name } from "./Form.svelte"\nconsole.log(Name)\n',
				"svelte.cjs":
					"module.exports = source => /<script>([\\S\\s]*)<\\/script>/.exec(source)[1]\n"
			},
			fromHere("temp", "unfoldedWebpack")
		)
		for (const name of Object.keys(compilers) as (keyof typeof compilers)[]) {
			it(name, async () => {
				const [compile, plugin] = compilers[name]
				const compiler = (compile as typeof webpack)({
					mode: "production",
					context: loaded,
					entry: "./form.js",
					target: "node",
					output: { path: join(loaded, "out", name) },
					module: {
						rules: [{ test: /\.svelte$/, loader: join(loaded, "svelte.cjs") }]
					},
					plugins: [plugin({ cwd: loaded }) as never]
				})
				const stats = await new Promise<Stats | undefined>((resolve, reject) =>
					compiler.run((error, stats) =>
						compiler.close(() => (error ? reject(error) : resolve(stats)))
					)
				)
				// Rspack marks each error with a ×
				attest(
					stats
						?.toJson()
						.errors?.map(error =>
							stripVTControlCharacters(error.message).trim().replace(/^× /, "")
						)
				).equals([
					writeUntransformedHelperMessage("Form.svelte", "fields.js", "text")
				])
			})
		}
	})

	describe("fails where a module with no file of its own imports arktype", () => {
		const source =
			'import { type } from "arktype"\nexport const User = type({ name: "string" })\n'
		const url = `data:text/javascript,${encodeURIComponent(source)}`
		const root = writeFixture(
			{ "main.js": `export { User } from ${JSON.stringify(url)}\n` },
			fromHere("temp", "fileless")
		)
		const failure = (id: string) => writeFilelessImportMessage(id, "arktype")

		it("esbuild", async () => {
			const build = (options: BuildOptions) =>
				esbuild({
					bundle: true,
					write: false,
					format: "esm",
					absWorkingDir: root,
					conditions: [...conditions, "production"],
					logLevel: "silent",
					...options
				}).then(
					() => [],
					(e: { errors: { text: string }[] }) => e.errors.map(e => e.text)
				)
			// a plugin's own namespace, as Sury's benchmark loads its entries
			const virtual: Plugin = {
				name: "virtual",
				setup: build => {
					build.onResolve({ filter: /^virtual:/ }, args => ({
						path: args.path,
						namespace: "virtual"
					}))
					build.onLoad({ filter: /.*/, namespace: "virtual" }, () => ({
						contents: source,
						loader: "js",
						resolveDir: root
					}))
				}
			}
			attest(
				await build({
					entryPoints: ["virtual:schemas"],
					plugins: [virtual, precompile.esbuild({ cwd: root, conditions })]
				})
			).equals([failure("virtual:schemas")])
			attest(
				await build({
					stdin: { contents: source, resolveDir: root },
					plugins: [precompile.esbuild({ cwd: root, conditions })]
				})
			).equals([failure("<stdin>")])
			// esbuild names it as a file where both of these are set
			attest(
				await build({
					stdin: { contents: source, resolveDir: root, sourcefile: "main.ts" },
					plugins: [precompile.esbuild({ cwd: root, conditions })]
				})
			).equals([failure("<stdin>")])
		})

		it("vite", async () => {
			const message = await viteBuild({
				...viteConfig(undefined, root),
				plugins: [
					{
						name: "virtual",
						resolveId: id =>
							id === "virtual:schemas" ? "\0virtual:schemas" : undefined,
						load: id => (id === "\0virtual:schemas" ? source : undefined)
					},
					precompile.vite({ cwd: root, conditions })
				],
				build: { write: false, rollupOptions: { input: "virtual:schemas" } }
			}).then(
				() => [],
				(e: { errors: Error[] }) => e.errors.map(e => e.message)
			)
			attest(message).equals([failure("virtual:schemas")])
		})

		it("webpack", async () => {
			const compiler = webpack({
				mode: "production",
				context: root,
				entry: "./main.js",
				target: "node",
				output: { path: join(root, "out") },
				plugins: [precompile.webpack({ cwd: root })]
			})
			const stats = await new Promise<Stats | undefined>((resolve, reject) =>
				compiler.run((error, stats) =>
					compiler.close(() => (error ? reject(error) : resolve(stats)))
				)
			)
			// webpack follows it with hints for a failed resolution
			attest(
				stats
					?.toJson()
					.errors?.map(error => error.message.includes(failure(url)))
			).equals([true])
		})
	})

	it("fails where another esbuild plugin loads a module ahead of it", async () => {
		const root = writeFixture(
			{
				"main.ts":
					'import { type } from "arktype"\nexport const User = type({ name: "string" })\n'
			},
			fromHere("temp", "loadedFirst")
		)
		const loader: Plugin = {
			name: "loader",
			setup: build =>
				build.onLoad({ filter: /\.ts$/ }, args => ({
					contents: readFileSync(args.path, "utf8"),
					loader: "ts"
				}))
		}
		const errors = await esbuild({
			entryPoints: [join(root, "main.ts")],
			bundle: true,
			write: false,
			conditions,
			logLevel: "silent",
			plugins: [loader, precompile.esbuild({ cwd: root, conditions })]
		}).then(
			() => [],
			(e: { errors: { text: string }[] }) => e.errors.map(e => e.text)
		)
		attest(errors).equals([
			writeLoadedFirstMessage(join(root, "main.ts"), "arktype", root)
		])
	})

	it("fails for a second copy of arktype, of another version", async () => {
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
  ${arktypeVersion} at node_modules/arktype, reached from forked.ts
  2.1.0 at node_modules/forked/node_modules/arktype, reached from node_modules/forked/index.js`
		for (const runtime of [undefined, "arktype"] as const) {
			const { errors } = await buildDependency("forked.ts", { runtime })
			attest(errors.some(text => text.includes(report))).equals(true)
			attest((await vite(runtime)).includes(report)).equals(true)
			if (runtime) continue
			// its copy is also a version other than the build's own
			attest(errors.filter(text => text.includes("@ark/aot runs on"))).equals([
				`@ark/schema resolves to 0.1.0, but @ark/aot runs on ${schemaVersion}
  0.1.0 at node_modules/@ark/schema, reached from node_modules/forked/node_modules/arktype/index.js
  ${schemaVersion} at ${ownPath("schema")}, which @ark/aot imports
  ${versionHint}`,
				`arktype resolves to 2.1.0, but @ark/aot runs on ${arktypeVersion}
  2.1.0 at node_modules/forked/node_modules/arktype, reached from node_modules/forked/index.js
  ${arktypeVersion} at ${ownPath("type")}, which @ark/aot imports
  ${versionHint}`
			])
		}
	})

	it("names the @ark/aot released with a program's own arktype", async () => {
		attest(
			(await buildDependency("upgraded/main.ts")).errors.filter(text =>
				text.includes("arktype resolves to")
			)
		).equals([
			`upgraded/main.ts:1:22  arktype resolves to 9.0.0, but @ark/aot runs on ${arktypeVersion}
  9.0.0 at upgraded/node_modules/arktype, reached from upgraded/main.ts
  ${arktypeVersion} at ${ownPath("type")}, which @ark/aot imports
  A precompiled validator is written for the arktype it was built with. Install the @ark/aot released with arktype 9.0.0, so it imports what the program does: npm i -D @ark/aot@9.1.0
upgraded/main.ts:1:22  @ark/schema resolves to 0.1.0, but @ark/aot runs on ${schemaVersion}
  0.1.0 at node_modules/@ark/schema, reached from upgraded/node_modules/arktype/index.js
  ${schemaVersion} at ${ownPath("schema")}, which @ark/aot imports
  ${versionHint}`
		])
	})

	it("fails for a second copy of a package arktype runs on", async () => {
		attest(
			(await buildDependency("schema.ts")).errors.filter(text =>
				text.includes("more than one copy")
			)
		).equals([
			`schema.ts:1:8  @ark/schema resolves to 0.1.0, but @ark/aot runs on ${schemaVersion}
  0.1.0 at node_modules/@ark/schema, reached from schema.ts
  ${schemaVersion} at ${ownPath("schema")}, which @ark/aot imports
  ${versionHint}
schema.ts:2:22  @ark/schema resolves to more than one copy
  0.1.0 at node_modules/@ark/schema, reached from schema.ts
  ${schemaVersion} at node_modules/arktype/node_modules/@ark/schema, reached from node_modules/arktype/index.js
  Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides.`
		])
	})

	it("bundles only the Types and members a program reads", async () => {
		const files = {
			"user.ts": `import { type } from "arktype"

console.log("user.ts")
export const User = type({ name: "string", age: "number.integer" })
export const Unimported = type({ a: "'unimported'" })
`,
			// TypeScript's defaults, which drop an import nothing reads
			"tsconfig.json": "{}"
		}
		const validated = writeFixture(
			{
				...files,
				"main.ts": `import { ArkErrors, type } from "arktype"
import { User } from "./user.ts"

const out = User({ name: 1, age: 1 })
console.log(out instanceof ArkErrors, out instanceof type.errors)
`
			},
			fromHere("temp", "imported")
		)
		const bundle = await bundlers.esbuild({ cwd: validated }, validated)
		attest(run(bundle)).equals("user.ts\ntrue true\n")
		attest(bundle.includes("unimported")).equals(false)
		// a Type read only for introspection needs no validator
		for (const [name, main] of Object.entries({
			introspectedOnly: `import { type } from "arktype"

const User = type({ name: "string", age: "number.integer" })
console.log(JSON.stringify(User.toJsonSchema()))
`,
			introspectedImport: `import { User } from "./user.ts"

console.log(JSON.stringify(User.toJsonSchema()))
`
		})) {
			const root = writeFixture(
				{ ...files, "main.ts": main },
				fromHere("temp", name)
			)
			const introspected = await bundlers.esbuild({ cwd: root }, root)
			attest(run(introspected)).equals(runPlain(root))
			attest(introspected.includes("traverseAllows")).equals(false)
		}
	})

	it("undetailed bundles", async () => {
		const reads = join(undetailed, "reads")
		const message = `${join(undetailed, "node_modules", "reads", "index.js")} imports @ark/schema, which a build with errors: "none" can't load beside its runtime, a copy of @ark/schema's whose errors are a class of their own. Import what it reads from arktype, which a standalone build resolves to that runtime, or build without errors: "none".`
		for (const bundler of ["esbuild", "vite"] as const) {
			attest(
				run(
					await bundlers[bundler](
						{ cwd: undetailed, errors: "none" },
						undetailed
					)
				)
			).equals(undetailedOutput)
			const failed = await bundlers[bundler](
				{ cwd: reads, errors: "none" },
				reads
			).then(
				() => "",
				(e: Error) => e.message
			)
			attest(failed.includes(message)).equals(true)
		}
		// in this repo the runtime it loads in place of @ark/schema's re-exports it
		const { metafile } = await esbuild({
			entryPoints: [join(undetailed, "main.ts")],
			// which each input's path is relative to
			absWorkingDir: fromHere("..", "..", ".."),
			bundle: true,
			write: false,
			metafile: true,
			conditions,
			logLevel: "silent",
			plugins: [
				precompile.esbuild({ cwd: undetailed, errors: "none", conditions })
			]
		})
		attest(
			Object.keys(metafile.inputs).filter(path =>
				path.includes("schema/runtime")
			)
		).snap(["ark/schema/runtime.ts", "ark/schema/runtimeNone.ts"])
	})

	it("resolves the runtime of webpack's mode", async () => {
		const resolvedIn = async (mode: string) => {
			const plugin = precompile.raw(
				{ cwd: app, conditions },
				{
					framework: "webpack",
					webpack: { compiler: {} as never },
					versions: {}
				}
			) as unknown as RawHooks
			plugin.webpack({
				options: { cache: false, mode, module: { rules: [] } },
				hooks: { compilation: { tap: () => {} } }
			})
			const resolved = await plugin.resolveId.handler.call(
				{ warn: () => {} },
				"arktype",
				join(app, "main.ts")
			)
			return relative(fromHere("..", ".."), resolved!).replace(/\\/g, "/")
		}
		attest([
			await resolvedIn("development"),
			await resolvedIn("production")
		]).snap(["type/runtimeDevelopment.ts", "type/runtime.ts"])
	})

	it("resolves the runtime of the mode Rsbuild gives each compiler", async () => {
		const resolvedIn = async (mode: string) => {
			const plugin = precompile.raw(
				{ cwd: app, conditions },
				{ framework: "rsbuild", versions: {} }
			) as unknown as RawHooks & {
				rsbuild: { setup(api: object): void }
			}
			const plugins: { apply(compiler: object): void }[] = []
			plugin.rsbuild.setup({
				modifyRspackConfig: (modify: (config: object) => void) =>
					modify({ plugins })
			})
			for (const { apply } of plugins) {
				apply({
					context: app,
					options: { cache: false, mode, module: { rules: [] } },
					hooks: { compilation: { tap: () => {} } }
				})
			}
			const resolved = await plugin.resolveId.handler.call(
				{ warn: () => {} },
				"arktype",
				join(app, "main.ts")
			)
			return relative(fromHere("..", ".."), resolved!).replace(/\\/g, "/")
		}
		attest([
			await resolvedIn("development"),
			await resolvedIn("production")
		]).snap(["type/runtimeDevelopment.ts", "type/runtime.ts"])
	})

	it("loads the modules a webpack build's cache kept", async () => {
		const cache = {
			type: "filesystem",
			cacheLocation: join(writeFixture({}), "default-production")
		}
		// each build of a process, the second restoring what the first cached
		const webpackBuild = () => {
			const plugin = precompile.raw(
				{ cwd: app, conditions },
				{
					framework: "webpack",
					webpack: { compiler: {} as never },
					versions: {}
				}
			) as unknown as RawHooks
			plugin.webpack({
				options: { cache, module: { rules: [] } },
				hooks: { compilation: { tap: () => {} } }
			})
			return plugin
		}
		const id = join(app, "schemas.ts")
		const transformed = await webpackBuild().transform.handler.call(
			{ addWatchFile: () => {}, warn: () => {} },
			readFileSync(id, "utf8"),
			id
		)
		const specifiers = [...transformed.code.matchAll(/"(~arktype\/[^"]+)"/g)]
		const cached = webpackBuild()
		attest(
			specifiers.every(([, specifier]) =>
				cached.load.handler(`\0${specifier}`)?.includes("arktype/runtime")
			)
		).equals(true)
		attest(() => cached.load.handler("\0~arktype/lost")).throws(
			writeUncachedModuleMessage(
				"~arktype/lost",
				join(cache.cacheLocation, "arktype")
			)
		)
	})

	it("versions a persistent cache by the options, ark.json's included", () => {
		const root = writeFixture({ "package.json": "{}" })
		const versionOf = (cache: { type: string; version?: string }) => {
			const plugin = precompile.raw(
				{ cwd: root, conditions },
				{
					framework: "webpack",
					webpack: { compiler: {} as never },
					versions: {}
				}
			) as unknown as RawHooks
			plugin.webpack({
				options: { cache, module: { rules: [] } },
				hooks: { compilation: { tap: () => {} } }
			})
			return cache.version
		}
		const unset = versionOf({ type: "filesystem" })
		attest(versionOf({ type: "filesystem" })).equals(unset)
		writeFileSync(
			join(root, "ark.json"),
			JSON.stringify({ precompile: { errors: "none" } })
		)
		const none = versionOf({ type: "filesystem" })
		attest(none === unset).equals(false)
		attest(versionOf({ type: "persistent", version: "app" })).equals(
			`app ${none}`
		)
	})

	it("names a module no build wrote, where nothing caches it", () => {
		// Vite's, followed by the plugin reading what others write
		const [{ load }] = precompile.raw(
			{ cwd: app, conditions },
			{ framework: "vite", versions: {} }
		) as unknown as RawHooks[]
		attest(() => load.handler("\0~arktype/lost")).throws(
			writeUnwrittenModuleMessage("~arktype/lost")
		)
	})

	it("throws a module's errors from its root, without the precompiler's stack", async () => {
		const root = writeFixture({
			"main.ts":
				'import { type } from "arktype"\n\nexport const T = type(`number < ${Math.random()}`)\n'
		})
		const thrownBy = async (opts: PrecompileUnpluginOptions) => {
			const [{ transform }] = precompile.raw(
				{ ...opts, cwd: root, conditions },
				{ framework: "vite", versions: {} }
			) as unknown as RawHooks[]
			const thrown = (await transform.handler
				.call(
					{ addWatchFile: () => {}, warn: () => {} },
					readFileSync(join(root, "main.ts"), "utf8"),
					join(root, "main.ts")
				)
				.catch((e: Error) => e)) as Error
			return [thrown.message, thrown.stack]
		}
		attest(await thrownBy({})).snap([
			"main.ts:3:18  type(`number < ${Math.random()}`) cannot be precompiled\n  `Math.random` is not one of the build's pure built-ins\n  Replace `Math.random()` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.",
			""
		])
		// thrown by the precompiler's worker rather than reported for a module
		attest(await thrownBy({ config: "missing.ts" })).snap([
			"the config module missing.ts can't be read. Name a module that exists as the build's config.",
			""
		])
	})

	it("checks a default where its Type is created", async () => {
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

export const T = type({ a: type(["number", ":", n => n > limits.min]).default(5) })
`
		}
		// a bundler drops a module of such a package whose exports nothing reads
		const sideEffectFree = {
			...files,
			"config.ts": `${files["config.ts"]}export const configured = true\n`,
			"raise.ts": `${files["raise.ts"]}export const raised = true\n`,
			"package.json": `{ "type": "module", "sideEffects": false }`
		}
		const reading = (
			name: string,
			specifier: string
		) => `import { configured } from "./config.ts"
import { raised } from "./raise.ts"
import { ${name} } from "${specifier}"

console.log(configured, raised, JSON.stringify(${name}.toJsonSchema()))
`
		// a site reading any of a module's Types runs its other creations
		const siblings = `${files["t.ts"]}export const U = type({ b: "string" })\n`
		const programs: Record<string, Record<string, string>> = {
			imported: {
				...files,
				"main.ts": `import "./config.ts"
import "./raise.ts"
import { T } from "./t.ts"

console.log(JSON.stringify(T.toJsonSchema()))
`
			},
			unread: {
				...files,
				"main.ts": `import "./config.ts"
import "./raise.ts"
import { type } from "arktype"
import { limits } from "./limits.ts"

const T = type({ a: type(["number", ":", n => n > limits.min]).default(5) })
console.log("unread")
`
			},
			sideEffectFree: { ...sideEffectFree, "main.ts": reading("T", "./t.ts") },
			sibling: {
				...sideEffectFree,
				"t.ts": siblings,
				"main.ts": reading("U", "./t.ts")
			},
			workspace: {
				"config.ts": sideEffectFree["config.ts"],
				"raise.ts": `import { limits } from "pkg/limits"

limits.min = 10
export const raised = true
`,
				"main.ts": reading("U", "pkg/t"),
				"package.json": `{ "type": "module" }`,
				"packages/pkg/limits.ts": files["limits.ts"],
				"packages/pkg/t.ts": siblings,
				"packages/pkg/package.json": `{ "name": "pkg", "type": "module", "sideEffects": false, "exports": { "./t": "./t.ts", "./limits": "./limits.ts" } }`
			},
			helped: {
				...sideEffectFree,
				"t.ts": `${files["t.ts"]}export const make = () => type({ b: "string" })\n`,
				"u.ts": `import { make } from "./t.ts"

export const U = make()
`,
				"main.ts": reading("U", "./u.ts")
			}
		}
		const results: Record<string, unknown> = {}
		for (const [name, program] of Object.entries(programs)) {
			const root = writeFixture(program, fromHere("temp", `defaulted${name}`))
			if (name === "workspace") {
				rmSync(join(root, "node_modules"), { recursive: true, force: true })
				mkdirSync(join(root, "node_modules"))
				symlinkSync("../packages/pkg", join(root, "node_modules", "pkg"))
			}
			results[name] = thrownBy(
				await bundlers.esbuild({ cwd: root, config: "config.ts" }, root)
			)
		}
		attest(results).snap({
			imported: "Default must be valid according to an anonymous predicate",
			unread: "Default must be valid according to an anonymous predicate",
			sideEffectFree:
				"Default must be valid according to an anonymous predicate",
			sibling: "Default must be valid according to an anonymous predicate",
			workspace: "Default must be valid according to an anonymous predicate",
			helped: "Default must be valid according to an anonymous predicate"
		})
	})

	it("fixes the configuration of dropped Types", async () => {
		const root = writeFixture(
			{
				"config.ts":
					'import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "delete" })\n',
				"unread.ts":
					'import { type } from "arktype"\n\nconst schema = type({ dropped: "string" }).toJsonSchema()\n',
				"main.ts": 'import "./unread.ts"\nimport "./config.ts"\n'
			},
			fromHere("temp", "dropped")
		)
		// Node on Windows ends each line it prints of an uncaught error with \r\n
		const stderrOf = (args: string[], input?: string) =>
			spawnSync(process.execPath, args, {
				cwd: root,
				input,
				encoding: "utf8"
			}).stderr.replace(/\r\n/g, "\n")
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
				writeCreatedBeforeConfigureMessage("unread.ts", "./config.ts")
			)
		).equals(true)
	})

	it("no configuration check without configure", async () => {
		const bundle = await bundlers.esbuild({ cwd: app })
		attest(
			[writtenConfigMessage, "[object Date]"].filter(text =>
				bundle.includes(text)
			)
		).equals([])
	})

	it("throws writing a frozen input from CommonJS", async () => {
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
		// for size, a transforming traversal in its module is strict itself
		for (const optimize of ["speed", "size"] as const) {
			const { outputFiles } = await esbuild({
				entryPoints: [join(root, "main.ts")],
				bundle: true,
				write: false,
				format: "cjs",
				logLevel: "silent",
				conditions,
				plugins: [precompile.esbuild({ cwd: root, conditions, optimize })]
			})
			attest(
				spawnSync(process.execPath, ["--input-type=commonjs"], {
					input: outputFiles[0].text,
					encoding: "utf8"
				}).stdout
			).equals("TypeError\n")
		}
	})

	it("vitest", async () => {
		for (const runtime of [undefined, "arktype"] as const) {
			const state = await runVitest(
				app,
				{ runtime },
				{ ARKTYPE_RUNTIME: runtime ?? "" }
			)
			attest(outcomesOf(state)).equals({ failed: 0, passed: 2 })
		}
	})

	it("vitest reruns with its module cache", async () => {
		const fsModuleCachePath = tempDir()
		const runs: object[] = []
		for (let run = 0; run < 2; run++) {
			const vitest = await startVitest(
				[],
				{
					root: app,
					config: false,
					watch: false,
					reporters: [],
					fsModuleCache: true,
					fsModuleCachePath
				},
				viteConfig({}, app)
			)
			await vitest.close()
			runs.push(outcomesOf(vitest.state))
		}
		attest(runs).equals([
			{ failed: 0, passed: 2 },
			{ failed: 0, passed: 2 }
		])
	})

	it("vitest checks factories at creation", async () => {
		const checks = fromHere("checks")
		const state = await runVitest(checks, { cwd: checks })
		attest(
			state
				.getFiles()
				.flatMap(file => file.tasks)
				.map(task => `${task.result?.state} ${task.name}`)
		).snap([
			"pass creates each validator from what the build read",
			"pass a mocked module",
			"pass a mocked static helper",
			"pass a mutated import",
			"pass a mutated import another site reads elsewhere",
			"pass a mutated plain object",
			"pass a polyfilled builtin"
		])
	})
})
