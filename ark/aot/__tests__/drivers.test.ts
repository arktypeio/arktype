import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile as bunPlugin } from "@ark/aot/bun"
import { writeDeclareFrameworkMessage } from "@ark/aot/internal/declare.ts"
import { createNodeHost } from "@ark/aot/internal/host.ts"
import {
	createKeyedPrecompiler,
	type TransformedModule
} from "@ark/aot/internal/driver.ts"
import {
	configuredThreadMessage,
	writeTurbopackDependencyMessage,
	writeUnansweredResolveMessage,
	withAllowUnsafe,
	writeAliasMessage,
	writeExternalizedMessage,
	writeFilelessImportMessage,
	writePrecompiledDependencyMessage,
	writeTextlessMessage,
	writeUntransformedImportMessage,
	writeVariantImportMessage
} from "@ark/aot/internal/messages.ts"
import {
	createAsyncPrecompiler,
	type BundlerResolve
} from "@ark/aot/internal/worker.ts"
import { register } from "@ark/aot/node"
import turbopack from "@ark/aot/turbopack"
import type { PrecompilePluginOptions } from "@ark/aot/unplugin"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readFileSync,
	symlinkSync,
	utimesSync,
	writeFileSync
} from "node:fs"
import { join, relative, sep } from "node:path"
import { pathToFileURL } from "node:url"
import { configureAfterTypeMessage } from "@ark/schema"
import {
	hasBun,
	inFreshProcess,
	packageFiles,
	runBundle,
	runPlain,
	tempDir,
	undetailedOutput,
	writeFixture,
	writeLibrary,
	writeUndetailed
} from "./utils.ts"

const app = fromHere("app")
const tsconfig = fromHere("..", "..", "..", "tsconfig.json")

// the versions a precompiled module depends on, which a cache must key it by
const manifests = ["type", "schema", "util", "aot"].map(dir =>
	fromHere("..", "..", dir, "package.json")
)

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

// a test's timeout can't stop a synchronous child, so the child's does
const timeout = 60_000

const node = (
	args: string[],
	opts: PrecompilePluginOptions,
	cwd = app,
	env: Record<string, string> = {}
) =>
	spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--import",
			`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ ...opts, conditions, cwd })})`,
			...args
		],
		{ cwd, encoding: "utf8", timeout, env: { ...process.env, ...env } }
	)

// Node 22 reports a test run that isn't to a terminal as TAP
const spec = "--test-reporter=spec"

// options reach the plugin in app/preload.ts through the environment
const bun = (
	args: string[],
	{
		runtime = "",
		cwd = app,
		config = "",
		errors = ""
	}: { runtime?: string; cwd?: string; config?: string; errors?: string } = {}
) => {
	// `bun test` sets NODE_ENV only if unset, as a bundler run here may have
	const { NODE_ENV, ...env } = process.env
	return spawnSync("bun", args, {
		cwd,
		encoding: "utf8",
		timeout,
		env: {
			...env,
			ARKTYPE_RUNTIME: runtime,
			ARKTYPE_CONFIG: config,
			ARKTYPE_ERRORS: errors
		}
	})
}

// the message of the error a process printed, without its stack
// Node on Windows writes stderr's lines with \r\n, and paths with \
const thrownMessage = (output: string, root: string, prefix = "Error: ") => {
	const lines = output.split("\r\n").join("\n")
	return lines
		.slice(lines.indexOf(prefix) + prefix.length, lines.search(/\n +at /))
		.split(`${root}${sep}`)
		.join("")
		.split(`${root}/`)
		.join("")
}

const configured = fromHere("configured")
const transpiled = fromHere("transpiled")
const checks = fromHere("checks")
const writers = fromHere("writers")
const cycle = fromHere("cycle")
const cycleErased = fromHere("cycleErased")
const cycleOrder = fromHere("cycleOrder")
const library = writeLibrary()
const undetailed = writeUndetailed()
const logged = writeFixture(
	{
		"main.ts":
			'import { type } from "arktype"\n\nconsole.log(type({ a: "number" })({ a: "x" }))\n'
	},
	fromHere("temp", "logged")
)

contextualize(function (this: Mocha.Suite) {
	this.timeout(timeout)

	const expected = runPlain(app)

	it("loads from CommonJS, e.g. a webpack.config.js", () => {
		const { stdout } = spawnSync(
			process.execPath,
			[
				"--conditions",
				"ark-ts",
				"--input-type=commonjs",
				"-e",
				'console.log(JSON.stringify(["unplugin", "node", "turbopack"].map(name => Object.keys(require(`@ark/aot/${name}`)))))'
			],
			{ cwd: fromHere(), encoding: "utf8" }
		)
		attest(JSON.parse(stdout)).equals([
			["precompile"],
			["register"],
			["__esModule", "default"]
		])
	})

	it("refuses declare", () => {
		// @ts-expect-error
		attest(() => bunPlugin({ declare: true })).throws(
			writeDeclareFrameworkMessage("Bun")
		)
		// @ts-expect-error
		attest(() => register({ declare: true })).throws(
			writeDeclareFrameworkMessage("Node")
		)
		const loader = {
			getOptions: () => ({ declare: true }),
			resourcePath: "a.ts"
		}
		attest(() => turbopack.call(loader as never, "")).throws(
			writeDeclareFrameworkMessage("Turbopack")
		)
	})

	it("refuses a Node without module.registerHooks", () => {
		const { stderr } = spawnSync(
			process.execPath,
			[
				"--conditions",
				"ark-ts",
				"--import",
				`data:text/javascript,import module from "node:module"; delete module.registerHooks; Object.defineProperty(process.versions, "node", { value: "22.14.0" }); const { register } = await import("${pathToFileURL(fromHere("..", "node.ts"))}"); register()`,
				"-e",
				""
			],
			{ cwd: app, encoding: "utf8" }
		)
		attest(
			stderr.includes(
				"Error: @ark/aot/node needs Node 22.15 or later (this is 22.14.0)"
			)
		).equals(true)
	})

	describe("node", () => {
		it("standalone or cache", () => {
			for (const runtime of [undefined, "arktype"] as const)
				attest(node(["main.ts"], { runtime }).stdout).equals(expected)
		})

		it("prints errors as their issues outside production", () => {
			attest(node(["main.ts"], {}, logged).stdout).snap(`[
  {
    code: 'domain',
    path: [ 'a' ],
    data: 'x',
    expected: 'a number',
    message: 'a must be a number'
  }
]
`)
			// production loads the runtime without the inspect hook
			attest(
				node(["main.ts"], {}, logged, { NODE_ENV: "production" }).stdout
			).satisfies(/^ArkIssues {/)
		})

		it("a Type's member a library reads off a validator, outside production", () => {
			const dir = writeFixture(
				{
					"main.ts": `import { type } from "arktype"
import { inputSchemaOf } from "reader"

try {
	console.log(JSON.stringify(inputSchemaOf(type({ a: "string" }))))
} catch (e) {
	console.log((e as Error).message)
}
`,
					// a dependency the build doesn't read, which reads the Type it's handed
					"node_modules/reader/package.json": `{ "name": "reader", "type": "module", "main": "index.js" }`,
					"node_modules/reader/index.js": `export const inputSchemaOf = schema => schema.in.toJsonSchema()`,
					"node_modules/reader/index.d.ts": `export declare const inputSchemaOf: (schema: any) => unknown`
				},
				fromHere("temp", "lackedTypeMember")
			)
			attest(node(["main.ts"], {}, dir).stdout)
				.snap(`in is a Type's, which this standalone validator lacks. Put // @ark-runtime before the definition it's read off, so arktype defines it, or build with runtime: "arktype".
`)
			attest(node(["main.ts"], {}, dir, { NODE_ENV: "production" }).stdout)
				.snap(`Cannot read properties of undefined (reading 'toJsonSchema')
`)
		})

		it("a ~standard.jsonSchema read in its module and another, in and outside production", () => {
			const dir = writeFixture(
				{
					"main.ts": `import { type } from "arktype"
import { Exported } from "./exported.ts"

const jsonSchemaOf = (schema: any) =>
	JSON.stringify(schema["~standard"].jsonSchema.input({ target: "draft-2020-12" }))

console.log(jsonSchemaOf(type({ a: "string" })))
console.log(jsonSchemaOf(Exported))
`,
					// a build reading one module at a time bakes each member into its exports
					"exported.ts": `import { type } from "arktype"

export const Exported = type({ b: "number" })
`
				},
				fromHere("temp", "readJsonSchema")
			)
			const expected = `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"a":{"type":"string"}},"required":["a"]}
{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"b":{"type":"number"}},"required":["b"]}
`
			attest(node(["main.ts"], {}, dir).stdout).equals(expected)
			attest(
				node(["main.ts"], {}, dir, { NODE_ENV: "production" }).stdout
			).equals(expected)
		})

		it("import cycle", () => {
			const expected = runPlain(cycle)
			// a module reached before it loads creates lazily, even with lazy false
			for (const lazy of [undefined, false])
				attest(node(["main.ts"], { lazy }, cycle).stdout).equals(expected)
		})

		it("import cycles closed by a type import or logging as they run", () => {
			// type stripping keeps an import only a type reads, closing the cycle
			attest(node(["main.ts"], { lazy: false }, cycleErased).stdout).equals(
				runPlain(cycleErased)
			)
			// each module logs as it runs, so no added import runs one early unseen
			attest(
				node(["main.ts"], { members: { expression: true } }, cycleOrder).stdout
			).equals(runPlain(cycleOrder))
		})

		it("fails a test file with a rejected site", () => {
			const { status, stdout } = node(
				["--test", spec, "roles.ts", "main.ts"],
				{}
			)
			attest(status).equals(1)
			attest(
				stdout
					.match(/^. (?:roles|main)\.ts/gm)
					?.slice(0, 2)
					.sort()
			).equals(["✔ main.ts", "✖ roles.ts"])
			attest(thrownMessage(stdout, app))
				.snap(`roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: \`'\${proces… cannot be precompiled
  \`process\` is a global the build does not read
  Replace \`process.env.ADMIN_ROLE\` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.`)
		})

		it("a package reading arktype's nodes in a runtime island", () => {
			const root = writeFixture(
				{
					"package.json": JSON.stringify({ type: "module" }),
					...packageFiles("@ark/json-schema", {
						"index.js":
							'import { type } from "arktype"\n\nexport const jsonSchemaToType = schema => type({ [schema.key]: schema.type })\n'
					}),
					"main.ts": `import { jsonSchemaToType } from "@ark/json-schema"

// @ark-runtime
const Dyn = jsonSchemaToType({ key: "a", type: "string" })

console.log(Dyn.allows({ a: "x" }), Dyn.allows({ a: 1 }))
`
				},
				fromHere("temp", "readsNodesNode")
			)
			attest(node(["main.ts"], {}, root).stdout).equals("true false\n")
		})

		it("checks static helpers under node --test", () => {
			const { status, stdout } = node(
				["--experimental-test-module-mocks", "--test", spec, "node.check.ts"],
				{},
				checks
			)
			attest([status, stdout.match(/^ℹ pass \d+/m)?.[0]]).equals([
				0,
				"ℹ pass 2"
			])
		})

		it("packages that opt in", () => {
			attest(node(["main.ts"], {}, library).stdout).equals(runPlain(library))
			attest(node(["main.ts"], { inline: true }, library).stdout).equals(
				runPlain(library)
			)
		})

		it("undetailed programs", () => {
			attest(node(["main.ts"], { errors: "none" }, undetailed).stdout).equals(
				undetailedOutput
			)
			const { status, stderr } = node(
				["main.ts"],
				{ errors: "none" },
				join(undetailed, "reads")
			)
			attest(status).equals(1)
			attest(
				stderr.includes(
					writeVariantImportMessage(
						pathToFileURL(join(undetailed, "node_modules", "reads", "index.js"))
							.href,
						"@ark/schema",
						"none"
					)
				)
			).equals(true)
		})

		it("fails on a dependency shipping precompiled validators", () => {
			const root = writeFixture(
				{
					...packageFiles("prebuilt", {
						"index.js":
							'import { type } from "arktype/runtime"\nexport const prebuilt = typeof type\n'
					}),
					// not type-checked, as the package declares no types
					"main.js":
						'import { prebuilt } from "prebuilt"\nconsole.log(prebuilt)\n'
				},
				fromHere("temp", "prebuilt")
			)
			const failed = node(["main.js"], {}, root)
			const warned = node(["main.js"], { allowUnsafe: true }, root)
			attest([
				failed.status,
				thrownMessage(failed.stderr, root),
				warned.stdout,
				warned.stderr.includes(writePrecompiledDependencyMessage("prebuilt"))
			]).equals([
				1,
				withAllowUnsafe(writePrecompiledDependencyMessage("prebuilt")),
				"object\n",
				true
			])
		})

		it("configured", () => {
			const expected = runPlain(configured)
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					node(["main.ts"], { runtime, config: "config.ts" }, configured).stdout
				).equals(expected)
			}
		})

		it("configured by a module --import preloads", () => {
			const expected = runPlain(configured)
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					node(
						["--import", "./config.ts", "main.ts"],
						{ runtime, config: "config.ts" },
						configured
					).stdout
				).equals(expected)
			}
		})

		it("configured behind a transpiling loader", () => {
			const expected = runPlain(transpiled)
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					node(
						["--import", "./loader.ts", "main.ts"],
						{ runtime, config: "config.ts" },
						transpiled
					).stdout
				).equals(expected)
			}
		})

		it("refuses a module a loader hides", () => {
			const { status, stderr } = node(
				["--import", "./bypass.ts", "main.ts"],
				{ config: "config.ts" },
				transpiled
			)
			attest(status).equals(1)
			// the loader hides both, and Node 22 resolves main.ts's imports
			// before it loads config.ts, where later versions load config.ts first
			attest(
				["config.ts", "main.ts"].some(file =>
					stderr.includes(writeTextlessMessage(join(transpiled, file)))
				)
			).equals(true)
			attest(
				node(
					["--import", "./bypass.ts", "main.ts"],
					{ runtime: "arktype", config: "config.ts" },
					transpiled
				).stdout
			).equals(runPlain(transpiled))
		})

		it("refuses a module loaded before register()", () => {
			const { status, stderr } = spawnSync(
				process.execPath,
				["--conditions", "ark-ts", "start.ts"],
				{ cwd: transpiled, encoding: "utf8" }
			)
			attest(status).equals(1)
			attest(
				stderr.includes(
					`${join(transpiled, "start.ts")} imports arktype but was loaded without @ark/aot/node's hooks, before register() ran or by a loader that compiles it itself, as tsx does in a CommonJS package, so a standalone build can't precompile it. Register them first, as with \`node --import ./register.ts\`, and let Node run the TypeScript rather than a loader like tsx.`
				)
			).equals(true)
		})

		it("refuses a module it can't precompile importing arktype", () => {
			const root = writeFixture(
				{
					"package.json": '{ "type": "module" }',
					// a bin's file, which has no extension
					cli: 'import { type } from "arktype"\n\nconsole.log(type({ a: "number" })({ a: 1 }))\n'
				},
				fromHere("temp", "unprecompiled")
			)
			const failure = (args: string[]) => {
				const { status, stderr } = node(args, {}, root)
				return [status, thrownMessage(stderr, root)]
			}
			attest(failure(["cli"])).equals([
				1,
				writeUntransformedImportMessage(join(root, "cli"), "arktype", root)
			])
			attest(failure(["--eval", 'import("arktype")'])).equals([
				1,
				writeFilelessImportMessage("[eval]", "arktype")
			])
		})

		it("answers --eval code, or fails where its precompiler can't start", () => {
			const root = writeFixture(
				{
					"package.json": '{ "type": "module" }',
					"main.ts":
						'import { type } from "arktype"\n\nexport const T = type({ a: "number" })\n',
					"noWorkers.ts":
						'import { isMainThread } from "node:worker_threads"\n\nif (!isMainThread) throw new Error("no workers")\n'
				},
				fromHere("temp", "unstarted")
			)
			// --input-type fails a worker given it
			attest(
				node(
					[
						"--input-type=module",
						"--eval",
						'const { T } = await import("./main.ts")\nconsole.log(T({ a: 1 }))'
					],
					{},
					root
				).stdout
			).equals("{ a: 1 }\n")
			// a preload given as a flag stays out of the precompiler's thread
			attest(
				node(["--import", "./noWorkers.ts", "main.ts"], {}, root).status
			).equals(0)
			// one in NODE_OPTIONS runs in every thread
			const { status, stderr } = node(["main.ts"], {}, root, {
				NODE_OPTIONS: "--import ./noWorkers.ts"
			})
			attest([status, thrownMessage(stderr, root)]).equals([
				1,
				"@ark/aot's precompiler stopped before it answered, as it does where a module the process preloads throws in a worker thread, like ./noWorkers.ts, which NODE_OPTIONS loads. Pass it to node as a flag instead, as `node --import ./noWorkers.ts`, which keeps it out of the precompiler's thread, or return from it early where `isMainThread` from node:worker_threads is false. To see its error and stack, run `node -e 'new (require(\"node:worker_threads\").Worker)(new URL(\"data:text/javascript,\"))'` with the same NODE_OPTIONS."
			])
		})

		it("configured after a keyword Type is created", () => {
			const thrown = ["exportedFirst.ts", "earlyFirst.ts"].map(entry => {
				const plain = spawnSync(
					process.execPath,
					["--conditions", "ark-ts", entry],
					{
						cwd: configured,
						encoding: "utf8"
					}
				)
				attest(plain.stderr.includes(configureAfterTypeMessage)).equals(true)
				const { stderr } = node(
					[entry],
					{ config: "config.ts", allowUnsafe: true },
					configured
				)
				return thrownMessage(stderr, configured, "ParseError: ")
			})
			attest(thrown).snap([
				'exported.ts creates a Type before configure() runs\n  Import the config module before any module that creates a Type: first in the entry or test setup file that loads exported.ts, or at the top of exported.ts:\n  import "./config.ts"',
				'schemas.ts creates a Type before configure() runs\n  Import the config module before any module that creates a Type: first in the entry or test setup file that loads schemas.ts, or at the top of schemas.ts:\n  import "./config.ts"'
			])
		})

		it("fails where an import loads a Type before the config module", () => {
			const { status, stderr } = node(
				["earlyFirst.ts"],
				{ config: "config.ts" },
				configured
			)
			attest(status).equals(1)
			attest(thrownMessage(stderr, configured))
				.snap(`earlyFirst.ts:1:1  import { Email } from "./early.ts" loads schemas.ts, which creates a Type, before the config module config.ts runs configure()
  unless the program loaded config.ts earlier, creating the Type throws
  Import config.ts first, before any module that creates a Type, or set allowUnsafe: true to build anyway, with a warning.`)
		})
	})

	describe("turbopack", () => {
		// what the loader returns, or the message it throws
		const load = (
			dir: string,
			file = "main.ts",
			opts: PrecompilePluginOptions = {}
		) => {
			const dependencies: string[] = []
			try {
				// synchronous without getResolve
				const out = turbopack.call(
					{
						resourcePath: join(dir, file),
						getOptions: () => ({ ...opts, conditions, cwd: dir }),
						addDependency: dependency =>
							dependencies.push(
								dependency.startsWith(`${dir}${sep}`) ?
									relative(dir, dependency).split(sep).join("/")
								:	dependency
							),
						emitWarning: warning => {
							throw warning
						}
					},
					readFileSync(join(dir, file), "utf8")
				)!
				return { out, dependencies }
			} catch (e) {
				return { out: (e as Error).message, dependencies }
			}
		}

		// the first line of what main.ts loads as, or of the message it fails
		// with, where Turbopack resolves what `resolve` returns a path for
		const loadResolving = (
			dir: string,
			resolve: (request: string) => string | undefined
		) =>
			new Promise<string | undefined>(settle => {
				try {
					const returned = turbopack.call(
						{
							resourcePath: join(dir, "main.ts"),
							getOptions: () => ({ conditions, cwd: dir }),
							addDependency: () => {},
							emitWarning: warning => {
								throw warning
							},
							// reads options as Next 16.1's does, throwing where none are passed
							getResolve:
								({ alias }) =>
								async (_, request) => {
									const path = resolve(request)
									if (path === undefined)
										throw new Error(`Can't resolve ${request}`)
									return path
								},
							async: () => (error, result) => settle(error?.message ?? result)
						},
						readFileSync(join(dir, "main.ts"), "utf8")
					)
					if (returned !== undefined) settle(returned)
				} catch (e) {
					settle((e as Error).message)
				}
			}).then(out => out?.split("\n")[0])

		// an alias resolveAlias names, which no tsconfig.json does
		const aliasedMain = {
			"package.json": "{}",
			"main.ts":
				'import { User } from "#shared/types"\n\nconsole.log(String(User.errors))\n'
		}
		const sharedTypes = {
			"shared/types.ts":
				'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n'
		}
		const unreadErrors =
			"main.ts:3:20  User.errors reads errors, which a standalone validator lacks"

		it("reads an import only Turbopack resolves", async () => {
			const dir = writeFixture({ ...aliasedMain, ...sharedTypes })
			const out = await loadResolving(dir, request =>
				request === "#shared/types" ? join(dir, "shared/types.ts") : undefined
			)
			attest(out).equals(unreadErrors)
		})

		it("asks Turbopack only about an import that can carry a Type", () => {
			const dir = writeFixture({
				"package.json": "{}",
				"main.ts": `import { type } from "arktype"
import type { PageLoad } from "./$types"
import { type Shape } from "#types/inline"
import { Read } from "#types/read"
import { Value } from "#shared/value"
import "#shared/effect"
export { Other } from "#shared/other"
export type { Kind } from "#types/kind"

const note = 'import "#types/text"'
const load: PageLoad = () => ({}) as Read & Shape
export const User = type({ name: "string" })
console.log(Value, note, load, await import("#shared/lazy"))
`
			})
			// as installed, so the precompiler resolves it itself
			mkdirSync(join(dir, "node_modules"))
			symlinkSync(
				fromHere("..", "..", "type"),
				join(dir, "node_modules", "arktype")
			)
			const main = join(dir, "main.ts")
			const { unresolved } = createKeyedPrecompiler({
				conditions,
				cwd: dir
			}).precompile(readFileSync(main, "utf8"), main)
			attest(unresolved.map(([specifier]) => specifier).sort()).equals([
				"#shared/effect",
				"#shared/lazy",
				"#shared/other",
				"#shared/value"
			])
		})

		it("precompiles a module in either mode", () => {
			const standalone = load(app, "schemas.ts")
			attest(standalone.out).satisfies(
				/^var \$ark\$exports0;\nfunction \$ark\$load0\(\) {/
			)
			attest(standalone.dependencies).equals(["ark.ts", tsconfig, ...manifests])
			attest(load(app, "schemas.ts", { runtime: "arktype" }).out).satisfies(
				/^;\(\(registerPrecompiledUnits\) => {/
			)
		})

		it("fails a dependency that defines a Type, unless it's precompiled", () => {
			const dir = writeFixture({
				"package.json": "{}",
				...packageFiles("defines-types", {
					"index.js":
						'import { type } from "arktype"\nexport const User = type({ name: "string" })\n'
				}),
				// as @hono/arktype-validator, which reads only `type.errors`
				...packageFiles("reads-errors", {
					"index.js":
						'import { type } from "arktype"\nexport const failed = out => out instanceof type.errors\n'
				})
			})
			const definesTypes = "node_modules/defines-types/index.js"
			attest(load(dir, definesTypes).out).equals(
				writeTurbopackDependencyMessage("defines-types")
			)
			attest(
				load(dir, definesTypes, { dependencies: { "defines-types": "aot" } })
					.out
			).satisfies(/^var \$ark\$exports0;/)
			const readsErrors = "node_modules/reads-errors/index.js"
			attest(load(dir, readsErrors).out).equals(
				readFileSync(join(dir, readsErrors), "utf8")
			)
		})

		it("fails where arktype resolves other than its mode needs", async () => {
			const host = createNodeHost({ conditions })
			const main = readFileSync(join(app, "main.ts"), "utf8")
			// what the loader reports where Turbopack resolves arktype to `target`
			const failureOf = (
				target: string | undefined,
				opts: PrecompilePluginOptions = {},
				source = main
			) =>
				new Promise<string | undefined>(settle => {
					const returned = turbopack.call(
						{
							resourcePath: join(app, "main.ts"),
							getOptions: () => ({ ...opts, conditions, cwd: app }),
							addDependency: () => {},
							emitWarning: () => {},
							getResolve:
								({ alias }) =>
								async (dir, request) => {
									if (request === "arktype" && !target)
										throw new Error(`Can't resolve '${request}'`)
									return host.resolve(
										request === "arktype" ? target! : request,
										join(dir, "main.ts")
									)!
								},
							async: () => error => settle(error?.message)
						},
						source
					)
					// a module importing no runtime specifier is checked synchronously
					if (returned !== undefined) settle(undefined)
				})
			attest(await failureOf("arktype/runtime")).equals(undefined)
			// as resolved under the "development" condition
			attest(
				await failureOf(fromHere("..", "..", "type", "runtimeDevelopment.ts"))
			).equals(undefined)
			attest(await failureOf("arktype")).equals(
				writeAliasMessage("arktype", "../../../type/index.ts", {})
			)
			attest(await failureOf("arktype/runtime", { runtime: "arktype" })).equals(
				writeAliasMessage("arktype", undefined, { runtime: "arktype" })
			)
			attest(await failureOf("arktype", { runtime: "arktype" })).equals(
				undefined
			)
			// Turbopack reports a specifier it can't resolve
			attest(await failureOf(undefined)).equals(undefined)
			// only what a module imports is checked, not a string naming it
			attest(
				await failureOf(
					"arktype",
					{},
					"export const docs = \"see 'arktype/errors'\"\n"
				)
			).equals(undefined)
		})

		it("fails where @ark/schema/runtime resolves other than its errors need", async () => {
			const host = createNodeHost({ conditions })
			const main = readFileSync(join(app, "main.ts"), "utf8")
			// what the loader reports and warns where Turbopack resolves the schema runtime to `target`
			const outcomeOf = (target: string, opts: PrecompilePluginOptions = {}) =>
				new Promise<string[]>(settle => {
					const warnings: string[] = []
					turbopack.call(
						{
							resourcePath: join(app, "main.ts"),
							getOptions: () => ({ ...opts, conditions, cwd: app }),
							addDependency: () => {},
							emitWarning: warning => warnings.push(warning.message),
							getResolve: () => async (dir, request) =>
								host.resolve(
									request === "arktype" ?
										opts.shadow ?
											"arktype"
										:	"arktype/runtime"
									: request === "@ark/schema/runtime" ? target
									: request,
									join(dir, "main.ts")
								)!,
							async: () => error => settle(error ? [error.message] : warnings)
						},
						main
					)
				})
			const none = { errors: "none" } as const
			attest(await outcomeOf("@ark/schema/runtime/none", none)).equals([])
			attest(await outcomeOf("@ark/schema/runtime", none)).snap([
				'@ark/schema/runtime resolves to ../../../schema/runtime.ts rather than @ark/schema/runtime/none, which a build with errors: "none" loads in its place. Add to turbopack.resolveAlias: {"@ark/schema/runtime":"@ark/schema/runtime/none"}, and install @ark/schema if your package manager doesn\'t hoist it, as pnpm doesn\'t, or set allowUnsafe: true to build anyway, with a warning.'
			])
			attest(
				await outcomeOf("@ark/schema/runtime", { ...none, allowUnsafe: true })
			).snap([
				'@ark/schema/runtime resolves to ../../../schema/runtime.ts rather than @ark/schema/runtime/none, which a build with errors: "none" loads in its place. Add to turbopack.resolveAlias: {"@ark/schema/runtime":"@ark/schema/runtime/none"}, and install @ark/schema if your package manager doesn\'t hoist it, as pnpm doesn\'t.'
			])
			attest(await outcomeOf("@ark/schema/runtime")).equals([])
			attest(await outcomeOf("@ark/schema/runtime/none")).snap([
				'@ark/schema/runtime resolves to ../../../schema/runtimeNone.ts, a copy for a build with errors: "none" or optimizeErrors: "size". Remove its turbopack.resolveAlias, or set allowUnsafe: true to build anyway, with a warning.'
			])
			// shadow mode loads arktype, so leaves @ark/schema/runtime unchecked
			attest(
				await outcomeOf("@ark/schema/runtime", { ...none, shadow: true })
			).equals([])
		})

		type Change = (fs: typeof import("node:fs"), dir: string) => unknown

		// loads before and after a change to a file the precompiler read
		const loadedAcrossReplacement = (
			dir: string,
			files: string[],
			change: Change = (fs, dir) =>
				fs.utimesSync(`${dir}/config.ts`, new Date(), new Date())
		) =>
			inFreshProcess(
				async (dir: string, files: string[], change: Change) => {
					const fs = await import("node:fs")
					// as Turbopack passes it, in the platform's form
					const { join } = await import("node:path")
					const { default: turbopack } = await import("@ark/aot/turbopack")
					const load = (file: string) => {
						try {
							return turbopack.call(
								{
									resourcePath: join(dir, file),
									getOptions: () => ({
										config: "config.ts",
										conditions: ["ark-ts"],
										cwd: dir
									}),
									addDependency: () => {},
									emitWarning: warning => {
										throw warning
									}
								},
								fs.readFileSync(join(dir, file), "utf8")
							)
						} catch (e) {
							return (e as Error).message
						}
					}
					const before = files.map(load)
					change(fs, dir)
					return [before, files.map(load)] as const
				},
				[dir, files, change]
			)

		it("shares a configuration and its writers' refusals with the precompiler it replaces", () => {
			const [before, after] = loadedAcrossReplacement(configured, ["main.ts"])
			attest(after).equals(before)
			attest(before[0]).satisfies(
				/fixConfigured\("\w+", "main.ts", ".\/config.ts"\)/
			)
			const [refused, refusedAfter] = loadedAcrossReplacement(writers, [
				"main.ts"
			])
			attest(refusedAfter).equals(refused)
			attest(refused[0]).satisfies(/prints the name of `isLong`/)
		})

		describe("replaces its precompiler when", () => {
			const writeMain = (dir: string, specifier: string) =>
				writeFileSync(
					join(dir, "main.ts"),
					`import { type } from "arktype"\nimport { shape } from ${specifier}\n\nexport const T = type(shape)\n`
				)

			const writeShape = (path: string, domain: string, at?: Date) => {
				writeFileSync(
					path,
					`export const shape = { a: "${domain}" } as const\n`
				)
				if (at) utimesSync(path, at, at)
			}

			it("a module the configuration imports changes", () => {
				const dir = writeFixture({
					"config.ts":
						'import { configure } from "arktype/config"\nimport { describe } from /* writer */ "./locale.ts"\n\nconfigure({ domain: { description: describe } })\n',
					"main.ts":
						'import "./config.ts"\nimport { type } from "arktype"\n\nexport const T = type({ a: "number" })\n'
				})
				const changes: Change[] = [
					(fs, dir) =>
						fs.writeFileSync(
							`${dir}/locale.ts`,
							'export const describe = () => "a number"\n'
						),
					(fs, dir) => fs.rmSync(`${dir}/locale.ts`)
				]
				for (const change of changes) {
					writeFileSync(
						join(dir, "locale.ts"),
						'export const describe = () => "a numeral"\n'
					)
					const [before, after] = loadedAcrossReplacement(
						dir,
						["main.ts"],
						change
					)
					attest(before[0]).satisfies(/a numeral/)
					attest(after).equals([configuredThreadMessage])
				}
			})

			it("a module an import resolves to is created", () => {
				const dir = tempDir()
				writeMain(dir, '"./shape.js"')
				attest(load(dir).out).satisfies(/cannot be precompiled/)
				writeShape(join(dir, "shape.ts"), "number")
				attest(load(dir).out.includes('"number"')).equals(true)
			})

			it("a module only Turbopack resolves an import to is created", async () => {
				const dir = writeFixture(aliasedMain)
				const types = join(dir, "shared/types.ts")
				const resolve = (request: string) =>
					request === "#shared/types" && existsSync(types) ? types : undefined
				attest(await loadResolving(dir, resolve)).equals(
					'import { User } from "#shared/types"'
				)
				writeFixture(sharedTypes, dir)
				attest(await loadResolving(dir, resolve)).equals(unreadErrors)
			})

			it("a module it followed past a comment changes", () => {
				const dir = tempDir()
				writeMain(dir, '/* shapes */ "./shape.ts"')
				writeShape(join(dir, "shape.ts"), "string", new Date(0))
				attest(load(dir).out.includes('"number"')).equals(false)
				writeShape(join(dir, "shape.ts"), "number", new Date())
				attest(load(dir).out.includes('"number"')).equals(true)
			})

			it("the paths an import resolves through change", () => {
				const dir = tempDir()
				writeFileSync(
					join(dir, "tsconfig.json"),
					JSON.stringify({
						files: [],
						references: [{ path: "./tsconfig.app.json" }]
					})
				)
				const writeTsconfig = (target: string) =>
					writeFileSync(
						join(dir, "tsconfig.app.json"),
						JSON.stringify({
							compilerOptions: { paths: { "#shape": [target] } }
						})
					)
				writeMain(dir, '"#shape"')
				writeShape(join(dir, "a.ts"), "string")
				writeShape(join(dir, "b.ts"), "number")
				writeTsconfig("./a.ts")
				attest(load(dir).out.includes('"number"')).equals(false)
				writeTsconfig("./b.ts")
				attest(load(dir).out.includes('"number"')).equals(true)
			})
		})
	})

	describe("worker", () => {
		it("fails a request the bundler doesn't resolve an import for", async () => {
			const dir = writeFixture({
				"package.json": "{}",
				"main.ts":
					'import { User } from "#shared/types"\n\nconsole.log(String(User.errors))\n',
				"shared/types.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
				// what the answer it stops waiting for names
				"shared/other.ts": 'export const User = { errors: "" }\n'
			})
			const main = join(dir, "main.ts")
			const source = readFileSync(main, "utf8")
			const send = createAsyncPrecompiler({
				precompilerOptions: { cwd: dir, conditions },
				resolveTimeout: 500
			})
			// resolving waits on the worker, which waits on the resolution
			const cyclic: BundlerResolve = async () => {
				await send(["readDependency", main])
				return join(dir, "shared/other.ts")
			}
			const failure = await send(["transform", source, main], cyclic).then(
				() => undefined,
				(e: Error) => e.message
			)
			attest(failure).equals(
				writeUnansweredResolveMessage("#shared/types", "main.ts", 500)
			)
			// the next question isn't answered with other.ts, the late answer
			const transformed = (await send(["transform", source, main], async () =>
				join(dir, "shared/types.ts")
			)) as TransformedModule
			attest(transformed.errors.map(error => error.split("\n")[0])).equals([
				"main.ts:3:20  User.errors reads errors, which a standalone validator lacks"
			])
			await send(["close"])
		})
	})

	describe("bun", function () {
		before(function () {
			if (!hasBun()) this.skip()
		})

		const preload = [
			"--conditions",
			"ark-ts",
			"--preload",
			join(app, "preload.ts")
		]

		// a `bun test` run's status and pass count
		const passed = (result: ReturnType<typeof bun>) => [
			result.status,
			result.stderr.match(/\d+ pass/)?.[0]
		]

		it("standalone or cache", () => {
			for (const runtime of ["", "arktype"]) {
				attest(bun([...preload, "main.ts"], { runtime }).stdout).equals(
					expected
				)
			}
		})

		it("prints errors as their issues outside production", () => {
			attest(bun([...preload, "main.ts"], { cwd: logged }).stdout).snap(`[
  {
    code: "domain",
    path: [ "a" ],
    data: "x",
    expected: "a number",
    message: "a must be a number",
  }
]
`)
		})

		it("configured", () => {
			for (const runtime of ["", "arktype"]) {
				attest(
					bun([...preload, "main.ts"], {
						runtime,
						cwd: configured,
						config: "config.ts"
					}).stdout
				).equals(runPlain(configured))
			}
		})

		it("bun test", () => {
			for (const runtime of ["", "arktype"]) {
				attest(
					passed(bun(["test", ...preload, "./app.spec.ts"], { runtime }))
				).equals([0, "2 pass"])
			}
		})

		it("packages that opt in", () => {
			for (const runtime of ["", "arktype"]) {
				attest(
					passed(
						bun(["test", ...preload, "./tagged.spec.ts"], {
							runtime,
							cwd: library
						})
					)
				).equals([0, "1 pass"])
			}
		})

		it("undetailed programs", () => {
			attest(
				bun([...preload, "main.ts"], { cwd: undetailed, errors: "none" }).stdout
			).equals(undetailedOutput)
			const { status, stderr } = bun([...preload, "main.ts"], {
				cwd: join(undetailed, "reads"),
				errors: "none"
			})
			attest(status).equals(1)
			attest(
				stderr.includes(
					writeVariantImportMessage("a module", "@ark/schema", "none")
				)
			).equals(true)
		})

		describe("Bun.build", () => {
			const bunBuild = (opts: string) =>
				bun([
					"--conditions",
					"ark-ts",
					"-e",
					`import { precompile } from "@ark/aot/unplugin"
const result = await Bun.build({ entrypoints: ["./main.ts"], target: "node", conditions: ["ark-ts"], ...${opts}, plugins: [precompile.bun({ conditions: ["ark-ts"] })] })
console.log(await result.outputs[0].text())`
				])

			it("bundles the program precompiled, without a NUL", () => {
				const bundle = bunBuild("{}").stdout
				attest(bundle.includes("~arktype/")).equals(true)
				attest(bundle.includes("\0")).equals(false)
				attest(runBundle(bundle).stdout).equals(expected)
			})

			it("compiles an imported module's JSX with the jsxImportSource tsconfig.json sets", () => {
				const dir = writeFixture({
					"tsconfig.json": `{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "jsxlib" } }`,
					"node_modules/jsxlib/package.json": `{ "name": "jsxlib", "type": "module" }`,
					"node_modules/jsxlib/jsx-dev-runtime.js": `export const jsxDEV = tag => tag`,
					"node_modules/jsxlib/jsx-runtime.js": `export const jsx = tag => tag`,
					"main.ts": `import { b } from "./b.tsx"\n\nconsole.log(b)\n`,
					"b.tsx": "export const b = <b />\n"
				})
				const bundle = bunBuild(
					`{ entrypoints: [${JSON.stringify(join(dir, "main.ts"))}] }`
				).stdout
				attest(runBundle(bundle).stdout).equals("b\n")
			})

			it("fails a build leaving arktype external", () => {
				const { status, stderr } = bunBuild(`{ external: ["ark*"] }`)
				attest(status).equals(1)
				attest(
					stderr.includes(
						withAllowUnsafe(writeExternalizedMessage("arktype", "external"))
					)
				).equals(true)
			})
		})

		it("fails a module with a rejected site", () => {
			const { status, stderr } = bun([...preload, "roles.ts"])
			attest(status).equals(1)
			attest(thrownMessage(stderr, app, "error: "))
				.snap(`roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: \`'\${proces… cannot be precompiled
  \`process\` is a global the build does not read
  Replace \`process.env.ADMIN_ROLE\` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.`)
		})
	})
})
