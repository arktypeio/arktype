import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	configuredThreadMessage,
	writeOptionValueMessage,
	writeTextlessMessage,
	writeUndetailedImportMessage
} from "@ark/precompile"
import { precompile as bunPlugin } from "@ark/precompile/bun"
import { check } from "@ark/precompile/internal/check.ts"
import { writeDeclareFrameworkMessage } from "@ark/precompile/internal/declare.ts"
import {
	createNodeHost,
	writeAliasMessage
} from "@ark/precompile/internal/host.ts"
import { register } from "@ark/precompile/node"
import turbopack from "@ark/precompile/turbopack"
import type { PrecompilePluginOptions } from "@ark/precompile/unplugin"
import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { configureAfterTypeMessage } from "@ark/schema"
import {
	configuredUnlikeBuildMessage,
	writeCreatedBeforeConfigureMessage
} from "@ark/schema/runtime"
import {
	hasBun,
	inFreshProcess,
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
const manifests = ["type", "schema", "util", "precompile"].map(dir =>
	fromHere("..", "..", dir, "package.json")
)

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

// a test's timeout can't stop a synchronous child, so the child's does
const timeout = 60_000

const node = (args: string[], opts: PrecompilePluginOptions, cwd = app) =>
	spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--import",
			`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ ...opts, conditions, cwd })})`,
			...args
		],
		{ cwd, encoding: "utf8", timeout }
	)

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
const thrownMessage = (output: string, root: string, prefix = "Error: ") =>
	output
		.slice(output.indexOf(prefix) + prefix.length, output.search(/\n +at /))
		.split(`${root}/`)
		.join("")

const islands = fromHere("islands")
const configured = fromHere("configured")
const transpiled = fromHere("transpiled")
const localized = fromHere("localized")
const checks = fromHere("checks")
const writers = fromHere("writers")
const calledHoles = fromHere("calledHoles")
const cycle = fromHere("cycle")
const cycleFirst = fromHere("cycleFirst")
const cycleErased = fromHere("cycleErased")
const cycleArrow = fromHere("cycleArrow")
const cycleOrder = fromHere("cycleOrder")
const setInStep = fromHere("setInStep")
const library = writeLibrary()
const undetailed = writeUndetailed()

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
				'console.log(JSON.stringify(["unplugin", "node", "turbopack"].map(name => Object.keys(require(`@ark/precompile/${name}`)))))'
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
				"Error: @ark/precompile/node needs Node 22.15 or later (this is 22.14.0)"
			)
		).equals(true)
	})

	it("refuses a non-path config", () => {
		attest(
			node(["main.ts"], { config: "" }).stderr.includes(
				writeOptionValueMessage("config", '""', "a module path or false")
			)
		).equals(true)
	})

	describe("node", () => {
		it("standalone", () => {
			attest(node(["main.ts"], {}).stdout).equals(expected)
		})

		it("cache", () => {
			attest(node(["main.ts"], { runtime: "arktype" }).stdout).equals(expected)
		})

		it("import cycle", () => {
			// a module reached before it loads creates lazily, even with lazy false
			for (const lazy of [undefined, false]) {
				attest(node(["main.ts"], { lazy }, cycle).stdout).equals(
					runPlain(cycle)
				)
				attest(
					node(
						["main.ts"],
						{ members: { expression: true, json: true }, lazy },
						cycleFirst
					).stdout
				).equals(runPlain(cycleFirst))
				// type stripping keeps an import only a type reads, closing the cycle
				attest(node(["main.ts"], { lazy }, cycleErased).stdout).equals(
					runPlain(cycleErased)
				)
				attest(
					node(["main.ts"], { members: { json: true }, lazy }, cycleArrow)
						.stdout
				).equals(runPlain(cycleArrow))
				// each module logs as it runs, so no added import runs one early unseen
				attest(
					node(["main.ts"], { members: { expression: true }, lazy }, cycleOrder)
						.stdout
				).equals(runPlain(cycleOrder))
				// a fold run once what it reads is set, before the statement setting it ends
				attest(
					node(["main.ts"], { members: { expression: true }, lazy }, setInStep)
						.stdout
				).equals(runPlain(setInStep))
			}
		}).timeout(120000)

		it("serves standalone modules", () => {
			const observer = `import { registerHooks } from "node:module"
const kinds = new Set()
registerHooks({ load: (url, context, nextLoad) => {
	if (url.startsWith("arktype:")) kinds.add(/^arktype:~arktype\\/(entry|build|expression|alias|domain|intersection|morph|proto|union|unit)?/.exec(url)[1] ?? "validators")
	return nextLoad(url, context)
} })
process.on("exit", () => console.log(JSON.stringify([...kinds].sort())))`
			const { stdout } = node(
				[
					"--import",
					`data:text/javascript,${encodeURIComponent(observer)}`,
					"main.ts"
				],
				{}
			)
			attest(stdout.slice(0, expected.length)).equals(expected)
			attest(JSON.parse(stdout.slice(expected.length))).snap([
				"alias",
				"domain",
				"intersection",
				"union",
				"unit",
				"validators"
			])
		})

		it("fails a test file with a rejected site", () => {
			const { status, stdout } = node(["--test", "roles.ts", "main.ts"], {})
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
  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`)
		})

		it("runtime islands", () => {
			attest(node(["main.ts"], { config: "config.ts" }, islands).stdout).equals(
				runPlain(islands)
			)
		})

		it("checks static helpers under node --test", () => {
			const { status, stdout } = node(
				["--experimental-test-module-mocks", "--test", "node.check.ts"],
				{},
				checks
			)
			attest([status, stdout.match(/^ℹ pass \d+/m)?.[0]]).equals([
				0,
				"ℹ pass 2"
			])
		})

		it("leaves checks to standalone mode", () => {
			attest(node(["--test", "main.ts"], { runtime: "arktype" }).status).equals(
				0
			)
		})

		it("packages that opt in", () => {
			attest(node(["main.ts"], {}, library).stdout).equals(runPlain(library))
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
					writeUndetailedImportMessage(
						pathToFileURL(join(undetailed, "node_modules", "reads", "index.js"))
							.href,
						"@ark/schema"
					)
				)
			).equals(true)
		})

		it("configured", () => {
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					node(["main.ts"], { runtime, config: "config.ts" }, configured).stdout
				).equals(runPlain(configured))
			}
		})

		it("configured behind a transpiling loader", () => {
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					node(
						["--import", "./loader.ts", "main.ts"],
						{ runtime, config: "config.ts" },
						transpiled
					).stdout
				).equals(runPlain(transpiled))
			}
		})

		it("configured by a rewritten module", () => {
			const args = ["--import", "./rewrite.ts", "main.ts"]
			attest(
				node(args, { config: "config.ts" }, transpiled).stderr.includes(
					configuredUnlikeBuildMessage
				)
			).equals(true)
			attest(
				node(args, { runtime: "arktype", config: "config.ts" }, transpiled)
					.stdout
			).equals(runPlain(transpiled, ...args))
		})

		it("refuses a module a loader hides", () => {
			const { status, stderr } = node(
				["--import", "./bypass.ts", "main.ts"],
				{ config: "config.ts" },
				transpiled
			)
			attest(status).equals(1)
			attest(
				stderr.includes(writeTextlessMessage(join(transpiled, "config.ts")))
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
				stderr.includes(writeTextlessMessage(join(transpiled, "start.ts")))
			).equals(true)
		})

		it("configured after a defining module loads", () => {
			const opts = { config: "config.ts" }
			attest(
				node(["unconfigured.ts"], opts, configured).stderr.includes(
					writeCreatedBeforeConfigureMessage("schemas.ts")
				)
			).equals(true)
		})

		it("configured after a keyword Type is created", () => {
			for (const [entry, path] of [
				["exportedFirst.ts", "exported.ts"],
				["earlyFirst.ts", "schemas.ts"]
			]) {
				const plain = spawnSync(
					process.execPath,
					["--conditions", "ark-ts", entry],
					{
						cwd: configured,
						encoding: "utf8"
					}
				)
				attest(plain.stderr.includes(configureAfterTypeMessage)).equals(true)
				const { stderr } = node([entry], { config: "config.ts" }, configured)
				attest(
					stderr.includes(writeCreatedBeforeConfigureMessage(path))
				).equals(true)
			}
			// the build warns where it sees an import load the Type first
			attest(
				check(["earlyFirst.ts"], { cwd: configured, config: "config.ts" }).lines
			).snap([
				'earlyFirst.ts:1:1  import { Email } from "./early.ts" loads schemas.ts, which creates a Type, before the config module config.ts runs configure()\n  unless the program loaded config.ts earlier, creating the Type throws\n  Import config.ts first, before any module that creates a Type.',
				"earlyFirst.ts:4:13  accepted",
				"1 site in 1 file: 1 accepted (100.0%)"
			])
		})

		it("refuses a configured locale", () => {
			const { status, stderr } = node(
				["main.ts"],
				{ config: "config.ts" },
				localized
			)
			attest(status).equals(1)
			attest(thrownMessage(stderr, localized))
				.snap(`main.ts:4:18  type("string") can't be precompiled yet
  a configured locale can't be precompiled to a standalone validator
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
		})

		it("a configured writer reading a hole's name", () => {
			const { status, stderr } = node(
				["main.ts"],
				{ config: "config.ts" },
				writers
			)
			attest(status).equals(1)
			attest(thrownMessage(stderr, writers))
				.snap(`main.ts:6:21  type("string").narrow(isLong) can't be precompiled yet
  \`node.expression\` (config.ts:5:38) prints the name of \`isLong\` (main.ts:4:16), which the build knows only by a placeholder
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".
main.ts:8:29  Long.description reads description, which a standalone validator lacks
  \`Long\` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read
  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".`)
		})

		it("a configured writer calling a hole", () => {
			const { status, stderr } = node(
				["main.ts"],
				{ config: "config.ts" },
				calledHoles
			)
			attest(status).equals(1)
			attest(thrownMessage(stderr, calledHoles))
				.snap(`main.ts:6:18  type("string").narrow(() => lenient) can't be precompiled yet
  arktype calls \`() => lenient\` (main.ts:6:40)
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
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
							dependencies.push(dependency.replace(`${dir}/`, "")),
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

		it("checks arktype resolves as its mode needs", async () => {
			const host = createNodeHost({ conditions })
			const main = readFileSync(join(app, "main.ts"), "utf8")
			// what the loader reports where Turbopack resolves arktype to `target`
			const check = (
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
							getResolve: () => async (dir, request) => {
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
			attest(await check("arktype/runtime")).equals(undefined)
			attest(await check("arktype")).equals(
				writeAliasMessage("arktype", "../../../type/index.ts", {})
			)
			attest(await check("arktype/runtime", { runtime: "arktype" })).equals(
				writeAliasMessage("arktype", undefined, { runtime: "arktype" })
			)
			attest(await check("arktype", { runtime: "arktype" })).equals(undefined)
			// Turbopack reports a specifier it can't resolve
			attest(await check(undefined)).equals(undefined)
			// only what a module imports is checked, not a string naming it
			attest(
				await check(
					"arktype",
					{},
					"export const docs = \"see 'arktype/errors'\"\n"
				)
			).equals(undefined)
		})

		it("reports dependencies before a rejected site", () => {
			const roles = load(app, "roles.ts")
			attest(roles.out.replace(`${app}/`, ""))
				.snap(`roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: \`'\${proces… cannot be precompiled
  \`process\` is a global the build does not read
  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`)
			attest(roles.dependencies).equals([
				"schemas.ts",
				"ark.ts",
				tsconfig,
				...manifests
			])
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
					const { default: turbopack } = await import(
						"@ark/precompile/turbopack"
					)
					const load = (file: string) => {
						try {
							return turbopack.call(
								{
									resourcePath: `${dir}/${file}`,
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
								fs.readFileSync(`${dir}/${file}`, "utf8")
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

		describe("shares with the precompiler it replaces", () => {
			it("a configuration", () => {
				const [before, after] = loadedAcrossReplacement(configured, ["main.ts"])
				attest(after).equals(before)
				attest(before[0]).satisfies(/fixConfigured\("\w+", "main.ts"\)/)
			})

			it("a configured writer's refusal", () => {
				const [before, after] = loadedAcrossReplacement(writers, ["main.ts"])
				attest(after).equals(before)
				attest(before[0]).satisfies(/prints the name of `isLong`/)
			})

			it("a configuration's problem", () => {
				const dir = writeFixture({
					"config.ts":
						'import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: process.env.KEYS === "delete" ? "delete" : "ignore" })\n',
					"main.ts":
						'import "./config.ts"\nimport { type } from "arktype"\n\nexport const T = type({ a: "string" })\n'
				})
				const [before, after] = loadedAcrossReplacement(dir, [
					"config.ts",
					"main.ts"
				])
				attest(after).equals(before)
				attest(before[0]).satisfies(
					/config\.ts:3:1 {2}configure\(.* is not static/
				)
			})
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

			it("a module it followed past a comment changes", () => {
				const dir = tempDir()
				writeMain(dir, '/* shapes */ "./shape.ts"')
				writeShape(join(dir, "shape.ts"), "string", new Date(0))
				attest(load(dir).out.includes('"number"')).equals(false)
				writeShape(join(dir, "shape.ts"), "number", new Date())
				attest(load(dir).out.includes('"number"')).equals(true)
			})

			it("a module an import resolves to is created", () => {
				const dir = tempDir()
				writeMain(dir, '"./shape.js"')
				attest(load(dir).out).satisfies(/cannot be precompiled/)
				writeShape(join(dir, "shape.ts"), "number")
				attest(load(dir).out.includes('"number"')).equals(true)
			})

			it("a module is created beside the directory an import resolved to", () => {
				const dir = tempDir()
				writeMain(dir, '"./shape"')
				mkdirSync(join(dir, "shape"))
				writeShape(join(dir, "shape", "index.ts"), "string")
				attest(load(dir).out.includes('"number"')).equals(false)
				writeShape(join(dir, "shape.ts"), "number")
				attest(load(dir).out.includes('"number"')).equals(true)
			})

			it("the paths an import resolves through change", () => {
				const dir = tempDir()
				const writeTsconfig = (target: string) =>
					writeFileSync(
						join(dir, "tsconfig.json"),
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

			it("a module an aliased import resolves to is created", () => {
				const dir = tempDir()
				writeFileSync(
					join(dir, "tsconfig.json"),
					JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } })
				)
				writeMain(dir, '"@/shape"')
				attest(load(dir).out).satisfies(/cannot be precompiled/)
				writeShape(join(dir, "shape.ts"), "number")
				attest(load(dir).out.includes('"number"')).equals(true)
			})

			it("a module it transformed changes", () => {
				const dir = tempDir()
				writeMain(dir, '"./shape.ts"')
				const writeTransformed = (domain: string, at: Date) => {
					writeFileSync(
						join(dir, "shape.ts"),
						`import { type } from "arktype"\n\nexport const shape = { a: "${domain}" } as const\n\nexport const Shape = type(shape)\n`
					)
					utimesSync(join(dir, "shape.ts"), at, at)
				}
				writeTransformed("string", new Date(0))
				load(dir, "shape.ts")
				attest(load(dir).out.includes('"number"')).equals(false)
				writeTransformed("number", new Date())
				attest(load(dir).out.includes('"number"')).equals(true)
			})
		})
	})

	if (!hasBun()) return

	describe("bun", () => {
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

		it("standalone", () => {
			attest(bun([...preload, "main.ts"]).stdout).equals(expected)
		})

		it("cache", () => {
			attest(
				bun([...preload, "main.ts"], { runtime: "arktype" }).stdout
			).equals(expected)
		})

		it("import cycle", () => {
			attest(bun([...preload, "main.ts"], { cwd: cycle }).stdout).equals(
				runPlain(cycle)
			)
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

		it("checks static helpers under bun test", () => {
			attest(
				passed(bun(["test", ...preload, "./bun.check.ts"], { cwd: checks }))
			).equals([0, "2 pass"])
		})

		it("runtime islands", () => {
			attest(
				bun([...preload, "main.ts"], { cwd: islands, config: "config.ts" })
					.stdout
			).equals(runPlain(islands))
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
				stderr.includes(writeUndetailedImportMessage("a module", "@ark/schema"))
			).equals(true)
		})

		it("fails a module with a rejected site", () => {
			const { status, stderr } = bun([...preload, "roles.ts"])
			attest(status).equals(1)
			attest(thrownMessage(stderr, app, "error: "))
				.snap(`roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: \`'\${proces… cannot be precompiled
  \`process\` is a global the build does not read
  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`)
		})
	})
})
