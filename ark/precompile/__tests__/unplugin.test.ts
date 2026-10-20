import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	writeStandaloneDependencyMessage,
	writeUndetailedImportMessage
} from "@ark/precompile"
import {
	emitDeclarations,
	writeDeclareFrameworkMessage,
	writeDeclaredOutsideMessage
} from "@ark/precompile/internal/declare.ts"
import {
	allowUnsafeHint,
	unbundledMessage,
	writePrecompiledDependencyMessage,
	writeUncachedModuleMessage,
	writeUntransformedImportMessage
} from "@ark/precompile/internal/host.ts"
import {
	precompile,
	type PrecompileUnpluginOptions
} from "@ark/precompile/unplugin"
import { context, build as esbuild, transformSync, type Plugin } from "esbuild"
import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { join, relative } from "node:path"
import { Worker } from "node:worker_threads"
import {
	createBuilder,
	createServer,
	build as viteBuild,
	defaultClientConditions,
	defaultServerConditions,
	type InlineConfig,
	type Rolldown
} from "vite"
import { startVitest } from "vitest/node"
import { configureAfterTypeMessage, copiedErrorMessage } from "@ark/schema"
import {
	writeCreatedBeforeConfigureMessage,
	writtenConfigMessage
} from "@ark/schema/runtime"
import { writeCreationMismatchMessage } from "arktype/runtime"
import {
	packageFiles,
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
		options: { cache: object; module: { rules: object[] } }
	}): void
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

const runBundle = (js: string) =>
	spawnSync(process.execPath, ["--input-type=module"], {
		input: js,
		encoding: "utf8"
	})

const run = (js: string) => runBundle(js).stdout

// a minified class prints its error's name, as `ce [ParseError]: `
const thrownBy = (js: string) =>
	/^(?:[\w$]+ \[)?\w*Error]?: (.*)$/m.exec(runBundle(js).stderr)?.[1]

const fakePackage = (path: string, name: string, version: string) =>
	packageFiles(
		name,
		{
			"index.js":
				"export const type = () => {}\nexport const registerPrecompiledUnits = () => {}\n"
		},
		{
			version,
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

// where a package the precompiler runs on is, from the program's root
const ownPath = (dir: string) =>
	relative(dependencies, fromHere("..", "..", dir))

const versionHint =
	"A precompiled validator is written for the arktype it was built with. Install one version of each, so @ark/precompile imports what the program does."

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
	...fakePackage("node_modules/forked", "forked", "1.0.0"),
	...fakePackage(
		"node_modules/forked/node_modules/arktype",
		"arktype",
		"2.1.0"
	),
	"node_modules/forked/index.js":
		'import { type } from "arktype"\nexport const forked = typeof type\n',
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
	setInStep: { expression: true }
}

const filesOf = (dir: string) =>
	Object.fromEntries(
		readdirSync(dir).map(file => [file, readFileSync(join(dir, file), "utf8")])
	)

contextualize(function (this: Mocha.Suite) {
	this.timeout(60_000)

	before(() => {
		dependencies = writeFixture(dependencyFiles)
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
			[
				["divisor", "age"],
				["pattern", "email"],
				["minLength", "name"],
				["maxLength", "tags"]
			],
			[
				["union", "plan"],
				["union", "role"]
			],
			[["min", 1, "age"]],
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
			[["pattern", "id"]],
			[["discriminant", "kind"]],
			"@ada",
			{ handle: "@ada", joined: 2020 },
			[["predicate", "handle"]],
			[["domain", "next", "next", "value"]],
			[["predicate", "next", "value"]],
			[["domain", "children", 1, "value"]],
			true,
			[["required", "box", "children", 0, "value"]],
			null,
			null
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
		})

		it(`${name} cache`, async () => {
			attest(run(await bundle({ runtime: "arktype" }))).equals(expected)
		})

		it(`${name} import cycles`, async () => {
			for (const [fixture, members] of Object.entries(cycles)) {
				const root = fromHere(fixture)
				attest(run(await bundle({ cwd: root, members }, root))).equals(
					runPlain(root)
				)
			}
		})

		// `verbatimModuleSyntax` keeps an import only a type reads
		it(`${name} import cycle closed by a type import`, async () => {
			const root = writeFixture(
				{
					...filesOf(fromHere("cycleErased")),
					"tsconfig.json": JSON.stringify({
						compilerOptions: { verbatimModuleSyntax: true }
					})
				},
				fromHere("temp", `${name}CycleErased`)
			)
			attest(run(await bundle({ cwd: root }, root))).equals(runPlain(root))
		})

		it(`${name} import cycle reaching json`, async () => {
			const files = filesOf(fromHere("cycle"))
			const root = writeFixture(
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
				run(await bundle({ cwd: root, members: { json: true } }, root))
			).equals(runPlain(root))
		})

		it(`${name} configured`, async () => {
			const opts = { cwd: configured, config: "config.ts" }
			const standalone = await bundle(opts, configured)
			attest(run(standalone)).equals(runPlain(configured))
			attest(standalone.includes(parserMessage)).equals(false)
			attest(
				run(await bundle({ ...opts, runtime: "arktype" }, configured))
			).equals(runPlain(configured))
		})

		it(`${name} configured with errors`, async () => {
			const opts = {
				cwd: firstConfigured,
				config: "config.ts",
				errors: "first" as const
			}
			const plain = runPlain(firstConfigured)
			attest(run(await bundle(opts, firstConfigured))).equals(plain)
			attest(
				run(
					await bundle(
						{ cwd: firstConfigured, config: "config.ts", runtime: "arktype" },
						firstConfigured
					)
				)
			).equals(plain)
		})

		it(`${name} configured to mutate its input`, async () => {
			const opts = {
				cwd: mutatingConfigured,
				config: "config.ts",
				mutatesInput: true as const
			}
			const plain = runPlain(mutatingConfigured)
			attest(plain).equals(
				'[{"name":"a","role":"user"},true,{"name":"a","role":"user"}]\n'
			)
			attest(run(await bundle(opts, mutatingConfigured))).equals(plain)
			attest(
				run(
					await bundle(
						{
							cwd: mutatingConfigured,
							config: "config.ts",
							runtime: "arktype"
						},
						mutatingConfigured
					)
				)
			).equals(plain)
		})

		it(`${name} resolves arktype/errors and arktype/mutatesInput to the runtime`, async () => {
			const bundles = await Promise.all([
				bundle(
					{ cwd: firstConfigured, config: "config.ts", errors: "first" },
					firstConfigured
				),
				bundle(
					{ cwd: mutatingConfigured, config: "config.ts", mutatesInput: true },
					mutatingConfigured
				)
			])
			attest(bundles.map(code => code.includes(copiedErrorMessage))).equals([
				false,
				false
			])
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

	it("esbuild an island piping into a validator", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const User = type({ name: "string" })

// called as arktype calls a morph, with the Traversal it pipes from
const validate: (data: unknown, ctx: unknown) => unknown = User

// @ark-runtime
const Parsed = type("string.json.parse").pipe((data, ctx) => validate(data, ctx))

const out = Parsed('{"name":5}')
console.log(JSON.stringify(out instanceof type.errors ? out.issues.map(issue => [issue.code, ...issue.path]) : out))
`
			},
			fromHere("temp", "pipedInto")
		)
		const plain = runPlain(root)
		attest(plain).snap(`[["domain","name"]]
`)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(plain)
		attest(
			run(
				await bundlers.esbuild({ cwd: root, members: { methods: false } }, root)
			)
		).equals(plain)
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

	it("esbuild unminified import cycles", async () => {
		for (const fixture of ["cycleFirst", "cycleArrow", "setInStep"]) {
			const root = fromHere(fixture)
			attest(
				run(
					await bundlers.esbuild(
						{ cwd: root, members: { expression: true, json: true } },
						root,
						false
					)
				)
			).equals(runPlain(root))
		}
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

	it("vite merges units by what its last build read", async () => {
		const cacheDir = tempDir()
		const build = async () => {
			const [{ output }] = (await viteBuild({
				...viteConfig({}),
				cacheDir,
				build: {
					write: false,
					minify: true,
					lib: { entry: "main.ts", formats: ["es"] }
				}
			})) as Rolldown.RolldownOutput[]
			return output[0]
		}
		const unitModulesOf = ({ moduleIds }: Rolldown.OutputChunk) =>
			moduleIds.filter(id => id.startsWith("\0~arktype/")).length
		const first = await build()
		const second = await build()
		attest([unitModulesOf(first), unitModulesOf(second)]).snap([31, 27])
		attest(run(second.code)).equals(expected)
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
				join(declared, "out", "~arktype.d.ts")
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

	it("vite emits no declarations while serving", async () => {
		attest(
			await warnedDeclaring(async config =>
				(await createServer(config)).close()
			)
		).equals([])
	})

	it("vite emits no declarations watching", async () => {
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
					join(layouts, "src", "index.d.ts"),
					join(layouts, "out")
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

	it("vite configured behind a transpiling plugin", async () => {
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
		// what the plugin threw, after Vite's header naming the module
		attest(message.split("\nError: ")[1])
			.snap(`main.ts:9:21  type({ name: \`string <= \${settings.limit}\` }) cannot be precompiled
  \`settings\` is \`{ limit: Math.random() }\` (main.ts:7:7)
  \`Math.random\` is not one of the build's pure built-ins
  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`)
	})

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

	it("names each module's ParseError thrower", async () => {
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
	})

	it("a Type defined from an imported one", async () => {
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
		attest(run(outputFiles[0].text)).equals('role must be "admin"\n')
		attest(outputFiles[0].text.includes(parserMessage)).equals(false)
	})

	it("fails once per dependency importing arktype", async () => {
		attest(await buildDependency("shared.ts")).equals({
			errors: [
				`${writeStandaloneDependencyMessage("shared")} ${allowUnsafeHint}`
			],
			warnings: []
		})
		attest(await buildDependency("shared.ts", { runtime: "arktype" })).equals({
			errors: [],
			warnings: []
		})
	})

	it("fails once per dependency shipping precompiled validators", async () => {
		attest(await buildDependency("prebuilt.ts")).equals({
			errors: [
				`${writePrecompiledDependencyMessage("prebuilt")} ${allowUnsafeHint}`
			],
			warnings: []
		})
	})

	it("warns of a dependency with allowUnsafe", async () => {
		attest(await buildDependency("shared.ts", { allowUnsafe: true })).equals({
			errors: [],
			warnings: [writeStandaloneDependencyMessage("shared")]
		})
		attest(await buildDependency("prebuilt.ts", { allowUnsafe: true })).equals({
			errors: [],
			warnings: [writePrecompiledDependencyMessage("prebuilt")]
		})
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
		attest((await build()).errors.map(error => error.text)).equals([
			`${message} ${allowUnsafeHint}`
		])
		const unsafe = await build(true)
		attest("warnings" in unsafe && unsafe.warnings.map(w => w.text)).equals([
			message
		])
	})

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
  ${arktypeVersion} at node_modules/arktype, reached from forked.ts
  2.1.0 at node_modules/forked/node_modules/arktype, reached from node_modules/forked/index.js`
		for (const runtime of [undefined, "arktype"] as const) {
			const { errors } = await buildDependency("forked.ts", { runtime })
			attest(errors.some(text => text.includes(report))).equals(true)
			attest((await vite(runtime)).includes(report)).equals(true)
		}
	})

	it("fails for a second copy of a package arktype runs on", async () => {
		attest(
			(await buildDependency("schema.ts")).errors.filter(text =>
				text.includes("more than one copy")
			)
		).equals([
			`schema.ts:1:8  @ark/schema resolves to 0.1.0, but @ark/precompile runs on ${schemaVersion}
  0.1.0 at node_modules/@ark/schema, reached from schema.ts
  ${schemaVersion} at ${ownPath("schema")}, which @ark/precompile imports
  ${versionHint}
schema.ts:2:22  @ark/schema resolves to more than one copy
  0.1.0 at node_modules/@ark/schema, reached from schema.ts
  ${schemaVersion} at node_modules/arktype/node_modules/@ark/schema, reached from node_modules/arktype/index.js
  Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides.`
		])
	})

	it("fails for a version of arktype other than its own", async () => {
		attest(
			(await buildDependency("forked.ts")).errors.filter(text =>
				text.includes("@ark/precompile runs on")
			)
		).equals([
			`@ark/schema resolves to 0.1.0, but @ark/precompile runs on ${schemaVersion}
  0.1.0 at node_modules/@ark/schema, reached from node_modules/forked/node_modules/arktype/index.js
  ${schemaVersion} at ${ownPath("schema")}, which @ark/precompile imports
  ${versionHint}`,
			`arktype resolves to 2.1.0, but @ark/precompile runs on ${arktypeVersion}
  2.1.0 at node_modules/forked/node_modules/arktype, reached from node_modules/forked/index.js
  ${arktypeVersion} at ${ownPath("type")}, which @ark/precompile imports
  ${versionHint}`
		])
	})

	it("definitions that run again", async () => {
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
// what a standalone validator's errors keep of arktype's
const issuesOf = (out: any) =>
	JSON.stringify(out.issues.map((issue: any) => [issue.code, ...issue.path]))
console.log(issuesOf(exported().a(1)))
console.log(twice()[1]("x"))
console.log(issuesOf(mapped()("x")))
`
			},
			fromHere("temp", "eachRun")
		)
		const expected = `[["domain"]]
x
[["predicate"]]
`
		attest(runPlain(root)).equals(expected)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(expected)
	})

	it("creates only the Types a bundle imports", async () => {
		const root = writeFixture(
			{
				"a.ts": `import { type } from "arktype"

export const A = type({ a: "string" })
export const Unimported = type({ a: "'unimported'" })
`,
				"main.ts": `import { A } from "./a.ts"

// what a standalone validator's errors keep of arktype's
console.log(JSON.stringify((A({ a: 1 }) as any).issues.map((issue: any) => [issue.code, ...issue.path])))
`
			},
			fromHere("temp", "imported")
		)
		const expected = `[["domain","a"]]\n`
		attest(runPlain(root)).equals(expected)
		const bundle = await bundlers.esbuild({ cwd: root }, root)
		attest(run(bundle)).equals(expected)
		attest(bundle.includes("unimported")).equals(false)
	})

	it("returns ArkErrors instances", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { ArkErrors, type } from "arktype"

const T = type("string")
console.log(T(5) instanceof ArkErrors, T(5) instanceof type.errors)
`
			},
			fromHere("temp", "arkErrors")
		)
		attest(runPlain(root)).equals("true true\n")
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(
			"true true\n"
		)
	})

	it("undetailed bundles", async () => {
		const reads = join(undetailed, "reads")
		const message = writeUndetailedImportMessage(
			join(undetailed, "node_modules", "reads", "index.js"),
			"@ark/schema"
		)
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

	it("reports a refused webpack import", async () => {
		const importer = join(undetailed, "node_modules", "reads", "index.js")
		const { resolveId } = precompile.raw(
			{ cwd: join(undetailed, "reads"), errors: "none" },
			{ framework: "webpack", webpack: { compiler: {} as never }, versions: {} }
		) as { resolveId: { handler: (...args: unknown[]) => Promise<unknown> } }
		const reported: string[] = []
		const resolved = await resolveId.handler.call(
			{ error: (message: string) => reported.push(message) },
			"@ark/schema",
			importer
		)
		attest(resolved).equals(undefined)
		attest(reported).equals([
			writeUndetailedImportMessage(importer, "@ark/schema")
		])
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
			plugin.webpack({ options: { cache, module: { rules: [] } } })
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

	it("throws a module's errors from its root, without the precompiler's stack", async () => {
		const root = writeFixture({
			"main.ts":
				'import { type } from "arktype"\n\nexport const T = type(`number < ${Math.random()}`)\n'
		})
		const thrownBy = async (opts: PrecompileUnpluginOptions) => {
			const { transform } = precompile.raw(
				{ ...opts, cwd: root, conditions },
				{ framework: "vite", versions: {} }
			) as unknown as RawHooks
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
			'main.ts:3:18  type(`number < ${Math.random()}`) cannot be precompiled\n  `Math.random` is not one of the build\'s pure built-ins\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
			""
		])
		// thrown by the precompiler's worker rather than reported for a module
		attest(await thrownBy({ config: "missing.ts" })).snap([
			"the config module missing.ts can't be read",
			""
		])
	})

	it("a predicate reading ctx in an intersection", async () => {
		const root = writeFixture(
			{
				"main.ts": `import { type } from "arktype"

const isFilled = (s: string, ctx: any) => s.length > 0 || ctx.reject("non-empty")
const double = (s: string) => s + s
const isEven = (o: object) => Object.keys(o).length % 2 === 0
const T = type([["string", ":", isFilled], [["string", "=>", double], "?"]]).and(
	type(["object", ":", isEven])
)
// what a standalone validator's errors keep of arktype's
for (const data of [["a"], ["a", "b"], [""], ["a", 2]]) {
	const out = T(data)
	console.log(out instanceof type.errors ? JSON.stringify(out.issues.map(issue => [issue.code, ...issue.path])) : String(out))
}
`
			},
			fromHere("temp", "branchAllows")
		)
		const expected = `[["predicate"]]
a,bb
[["predicate",0]]
[["domain",1]]
`
		attest(runPlain(root)).equals(expected)
		attest(run(await bundlers.esbuild({ cwd: root }, root))).equals(expected)
	})

	it("drops validators read only for introspection", async () => {
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
	})

	it("an import a local shadows", async () => {
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
	})

	it("compares an introspected Type's inputs at creation", async () => {
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

	it("keeps load-time validation in side-effect-free packages", async () => {
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
				await bundlers.esbuild({ cwd: root, members: { json: true } }, root)
			)
		).snap("PORT must be a well-formed numeric string")
	})

	it("checks functions where arktype would", async () => {
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
	})

	it("fixes the configuration of dropped Types", async () => {
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

	it("reports writes to frozen values", async () => {
		const root = writeFixture({
			"write.ts":
				'import { type } from "arktype"\nexport const T = type("string")\n;(T as any).note = 1\n'
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
		attest(await errorsOf("write.ts")).snap([
			'write.ts:3:2  (T as any).note = 1 writes to an arktype value, which throws at runtime\n  `T` is an arktype value, which the standalone runtime freezes with what it holds\n  Keep what you attach in an object of your own, or build with runtime: "arktype".'
		])
	})

	it("vitest", async () => {
		for (const runtime of [undefined, "arktype"] as const) {
			const state = await runVitest(
				app,
				{ runtime },
				{ ARKTYPE_RUNTIME: runtime ?? "" }
			)
			attest(state.getCountOfFailedTests()).equals(0)
		}
	})

	it("vitest configured", async () => {
		const state = await runVitest(
			configured,
			{ cwd: configured, config: "config.ts" },
			{ EXPECTED: runPlain(configured) }
		)
		attest([state.getCountOfFailedTests(), state.getFiles().length]).equals([
			0, 1
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
			"pass a hole with another arity",
			"pass a hole of another kind",
			"pass a hole of another kind in a definition folded to what it throws",
			"pass a hole with another prototype",
			"pass a polyfilled builtin"
		])
	})

	it("vitest with a package that opts in", async () => {
		for (const runtime of [undefined, "arktype"] as const) {
			const state = await runVitest(
				library,
				{ runtime, cwd: library },
				{ ARKTYPE_RUNTIME: runtime ?? "" }
			)
			attest([state.getCountOfFailedTests(), state.getFiles().length]).equals([
				0, 1
			])
		}
	})
})
