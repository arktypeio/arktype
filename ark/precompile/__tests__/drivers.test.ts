import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	configuredThreadMessage,
	writeOptionValueMessage,
	writeTextlessMessage,
	writeUndetailedImportMessage
} from "@ark/precompile"
import { precompile as bunPlugin } from "@ark/precompile/bun"
import { writeDeclareFrameworkMessage } from "@ark/precompile/internal/declare.ts"
import { createPrecompiler } from "@ark/precompile/internal/driver.ts"
import { register } from "@ark/precompile/node"
import turbopack from "@ark/precompile/turbopack"
import type { PrecompilePluginOptions } from "@ark/precompile/unplugin"
import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	utimesSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { configureAfterTypeMessage } from "@ark/schema"
import {
	configuredUnlikeBuildMessage,
	writeCreatedBeforeConfigureMessage
} from "@ark/schema/runtime"
import { undetailedOutput, writeLibrary, writeUndetailed } from "./utils.ts"

const app = fromHere("app")
const tsconfig = fromHere("..", "..", "..", "tsconfig.json")

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

// a test's own timeout can't stop a synchronous child, so an analysis that doesn't end fails here instead
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
	runtime?: "arktype",
	cwd = app,
	config = "",
	errors = ""
) => {
	// `bun test` sets NODE_ENV only if it isn't set, as a bundler run earlier in this process may have set it
	const { NODE_ENV, ...env } = process.env
	return spawnSync("bun", args, {
		cwd,
		encoding: "utf8",
		timeout,
		env: {
			...env,
			ARKTYPE_RUNTIME: runtime ?? "",
			ARKTYPE_CONFIG: config,
			ARKTYPE_ERRORS: errors
		}
	})
}

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

const runPlain = (cwd: string, ...args: string[]) =>
	spawnSync(
		process.execPath,
		["--conditions", "ark-ts", ...(args.length ? args : ["main.ts"])],
		{ cwd, encoding: "utf8" }
	).stdout

contextualize(() => {
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

	it("refuses declare, since no build tells it a build from a rebuild", () => {
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

	it("refuses a config that isn't a module path or false, rather than resolve it", () => {
		attest(() => createPrecompiler({ config: true as never })).throws(
			writeOptionValueMessage("config", "true", "a module path or false")
		)
		attest(
			node(["main.ts"], { config: "" }).stderr.includes(
				writeOptionValueMessage("config", '""', "a module path or false")
			)
		).equals(true)
	}).timeout(timeout)

	describe("node", () => {
		it("standalone", () => {
			attest(node(["main.ts"], {}).stdout).equals(expected)
		}).timeout(60000)

		it("cache", () => {
			attest(node(["main.ts"], { runtime: "arktype" }).stdout).equals(expected)
		}).timeout(60000)

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

		it("serves the modules a standalone module imports", () => {
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
		}).timeout(60000)

		it("fails a test file with a rejected site", () => {
			const { status, stdout } = node(["--test", "roles.ts", "main.ts"], {})
			attest(status).equals(1)
			attest(
				stdout
					.match(/^. (?:roles|main)\.ts/gm)
					?.slice(0, 2)
					.sort()
			).equals(["✔ main.ts", "✖ roles.ts"])
			attest(
				stdout
					.slice(stdout.indexOf("Error: ") + 7, stdout.indexOf("\n    at "))
					.replace(`${app}/`, "")
			)
				.snap(`roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: \`'\${proces… cannot be precompiled
  \`process\` is a global the build does not read
  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`)
		}).timeout(60000)

		it("runtime islands", () => {
			attest(node(["main.ts"], { config: "config.ts" }, islands).stdout).equals(
				runPlain(islands)
			)
		}).timeout(60000)

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
		}).timeout(60000)

		it("leaves checks to standalone mode under node --test", () => {
			attest(node(["--test", "main.ts"], { runtime: "arktype" }).status).equals(
				0
			)
		}).timeout(60000)

		it("packages that opt in", () => {
			attest(node(["main.ts"], {}, library).stdout).equals(runPlain(library))
		}).timeout(60000)

		it("runs a program without error detail on a runtime of its own, which no other entry of @ark/schema loads beside", () => {
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
		}).timeout(60000)

		it("configured", () => {
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					node(["main.ts"], { runtime, config: "config.ts" }, configured).stdout
				).equals(runPlain(configured))
			}
		}).timeout(60000)

		it("precompiles a configured program a later loader transpiles as tsx does", () => {
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					node(
						["--import", "./loader.ts", "main.ts"],
						{ runtime, config: "config.ts" },
						transpiled
					).stdout
				).equals(runPlain(transpiled))
			}
		}).timeout(60000)

		it("configured by a module a later loader rewrites", () => {
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
		}).timeout(60000)

		it("refuses in standalone mode a module a loader keeps its text from", () => {
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
		}).timeout(60000)

		it("refuses in standalone mode a module loaded before register() ran", () => {
			const { status, stderr } = spawnSync(
				process.execPath,
				["--conditions", "ark-ts", "start.ts"],
				{ cwd: transpiled, encoding: "utf8" }
			)
			attest(status).equals(1)
			attest(
				stderr.includes(writeTextlessMessage(join(transpiled, "start.ts")))
			).equals(true)
		}).timeout(60000)

		it("configured before a Type is created, after the module defining it loads", () => {
			const opts = { config: "config.ts" }
			attest(
				node(["unconfigured.ts"], opts, configured).stderr.includes(
					writeCreatedBeforeConfigureMessage("schemas.ts")
				)
			).equals(true)
		}).timeout(60000)

		it("configured after a Type read from a keyword Module is created", () => {
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
				attest(
					node([entry], { config: "config.ts" }, configured).stderr.includes(
						writeCreatedBeforeConfigureMessage(path)
					)
				).equals(true)
			}
		}).timeout(60000)

		it("refuses a configured locale", () => {
			const { status, stderr } = node(
				["main.ts"],
				{ config: "config.ts" },
				localized
			)
			attest(status).equals(1)
			attest(
				stderr
					.slice(stderr.indexOf("Error: ") + 7, stderr.indexOf("\n    at "))
					.replace(`${localized}/`, "")
			).snap(`main.ts:4:18  type("string") can't be precompiled yet
  a configured locale can't be precompiled to a standalone validator
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
		}).timeout(60000)

		it("reports a configured writer reading a hole's name", () => {
			const { status, stderr } = node(
				["main.ts"],
				{ config: "config.ts" },
				writers
			)
			attest(status).equals(1)
			attest(
				stderr
					.slice(stderr.indexOf("Error: ") + 7, stderr.indexOf("\n    at "))
					.split(`${writers}/`)
					.join("")
			)
				.snap(`main.ts:6:21  type("string").narrow(isLong) can't be precompiled yet
  \`node.expression\` (config.ts:5:38) prints the name of \`isLong\` (main.ts:4:16), which the build knows only by a placeholder
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".
main.ts:8:29  Long.description reads description, which a standalone validator lacks
  \`Long\` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read
  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".`)
		}).timeout(60000)

		it("reports a configured writer calling a hole", () => {
			const { status, stderr } = node(
				["main.ts"],
				{ config: "config.ts" },
				calledHoles
			)
			attest(status).equals(1)
			attest(
				stderr
					.slice(stderr.indexOf("Error: ") + 7, stderr.indexOf("\n    at "))
					.split(`${calledHoles}/`)
					.join("")
			)
				.snap(`main.ts:6:18  type("string").narrow(() => lenient) can't be precompiled yet
  arktype calls \`() => lenient\` (main.ts:6:40)
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
		}).timeout(60000)
	})
	describe("turbopack", () => {
		const load = (file: string, opts: PrecompilePluginOptions = {}) => {
			const resourcePath = join(app, file)
			const dependencies: string[] = []
			const run = () =>
				turbopack.call(
					{
						resourcePath,
						getOptions: () => ({ ...opts, conditions, cwd: app }),
						addDependency: dependency =>
							dependencies.push(dependency.replace(`${app}/`, "")),
						emitWarning: warning => {
							throw warning
						}
					},
					readFileSync(resourcePath, "utf8")
				)
			return { run, dependencies }
		}

		it("precompiles a module in either mode", () => {
			const standalone = load("schemas.ts")
			attest(standalone.run()).satisfies(
				/^var \$ark\$exports0;\nfunction \$ark\$load0\(\) {/
			)
			attest(standalone.dependencies).equals(["ark.ts", tsconfig])
			attest(load("schemas.ts", { runtime: "arktype" }).run()).satisfies(
				/^;\(\({ "registerPrecompiledUnits": /
			)
		}).timeout(60000)

		// each file loaded before and after one the precompiler read changes, so the loader replaces it, in a process whose arktype takes the configuration
		const loadedAcrossReplacement = (
			cwd: string,
			files: string[],
			change = 'utimesSync("config.ts", new Date(), new Date())'
		) =>
			JSON.parse(
				spawnSync(
					process.execPath,
					["--conditions", "ark-ts", "--input-type=module"],
					{
						cwd,
						encoding: "utf8",
						input: `import turbopack from "${pathToFileURL(fromHere("..", "turbopack.ts"))}"
import { readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs"
const load = file => {
	try {
		return turbopack.call({
			resourcePath: ${JSON.stringify(cwd)} + "/" + file,
			getOptions: () => (${JSON.stringify({ config: "config.ts", conditions, cwd })}),
			addDependency: () => {},
			emitWarning: warning => { throw warning }
		}, readFileSync(file, "utf8"))
	} catch (e) {
		return e.message
	}
}
const before = ${JSON.stringify(files)}.map(load)
${change}
console.log(JSON.stringify([before, ${JSON.stringify(files)}.map(load)]))`
					}
				).stdout
			) as [before: string[], after: string[]]

		it("shares a configuration with the precompiler it replaces", () => {
			const [before, after] = loadedAcrossReplacement(configured, ["main.ts"])
			attest(after).equals(before)
			attest(before[0]).satisfies(/fixConfigured\("\w+", "main.ts"\)/)
		}).timeout(60000)

		it("shares a configured writer's refusal with the precompiler it replaces", () => {
			const [before, after] = loadedAcrossReplacement(writers, ["main.ts"])
			attest(after).equals(before)
			attest(before[0].includes("prints the name of `isLong`")).equals(true)
		}).timeout(60000)

		it("shares a configuration's problem with the precompiler it replaces", () => {
			const dynamic = fromHere("temp", "dynamicConfig")
			mkdirSync(dynamic, { recursive: true })
			writeFileSync(
				join(dynamic, "config.ts"),
				'import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: process.env.KEYS === "delete" ? "delete" : "ignore" })\n'
			)
			writeFileSync(
				join(dynamic, "main.ts"),
				'import "./config.ts"\nimport { type } from "arktype"\n\nexport const T = type({ a: "string" })\n'
			)
			const [before, after] = loadedAcrossReplacement(dynamic, [
				"config.ts",
				"main.ts"
			])
			attest(after).equals(before)
			attest(before[0]).satisfies(
				/config\.ts:3:1 {2}configure\(.* is not static/
			)
		}).timeout(60000)

		it("replaces its precompiler when a module the configuration imports changes", () => {
			const hidden = fromHere("temp", "hiddenConfigImport")
			mkdirSync(hidden, { recursive: true })
			writeFileSync(
				join(hidden, "config.ts"),
				'import { configure } from "arktype/config"\nimport { describe } from /* writer */ "./locale.ts"\n\nconfigure({ domain: { description: describe } })\n'
			)
			writeFileSync(
				join(hidden, "main.ts"),
				'import "./config.ts"\nimport { type } from "arktype"\n\nexport const T = type({ a: "number" })\n'
			)
			for (const change of [
				`writeFileSync("locale.ts", 'export const describe = () => "a number"\\n')`,
				'rmSync("locale.ts")'
			]) {
				writeFileSync(
					join(hidden, "locale.ts"),
					'export const describe = () => "a numeral"\n'
				)
				const [before, after] = loadedAcrossReplacement(
					hidden,
					["main.ts"],
					change
				)
				attest(before[0].includes("a numeral")).equals(true)
				attest(after).equals([configuredThreadMessage])
			}
			writeFileSync(
				join(hidden, "locale.ts"),
				'export const describe = () => "a numeral"\n'
			)
		}).timeout(60000)

		const tempDirs: string[] = []

		afterEach(() => {
			for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true })
		})

		const tempDir = () => {
			const dir = realpathSync(mkdtempSync(join(tmpdir(), "ark-precompile-")))
			tempDirs.push(dir)
			return dir
		}

		const loadIn = (dir: string, file = "main.ts") => {
			try {
				return turbopack.call(
					{
						resourcePath: join(dir, file),
						getOptions: () => ({ conditions, cwd: dir }),
						addDependency: () => {},
						emitWarning: warning => {
							throw warning
						}
					},
					readFileSync(join(dir, file), "utf8")
				)
			} catch (e) {
				return (e as Error).message
			}
		}

		it("replaces its precompiler when a module it followed past a comment changes", () => {
			const dir = tempDir()
			writeFileSync(
				join(dir, "main.ts"),
				'import { type } from "arktype"\nimport { shape } from /* shapes */ "./shape.ts"\n\nexport const T = type(shape)\n'
			)
			const loadWith = (domain: string, at: Date) => {
				writeFileSync(
					join(dir, "shape.ts"),
					`export const shape = { a: "${domain}" } as const\n`
				)
				utimesSync(join(dir, "shape.ts"), at, at)
				return loadIn(dir)
			}
			attest(loadWith("string", new Date(0)).includes('"number"')).equals(false)
			attest(loadWith("number", new Date()).includes('"number"')).equals(true)
		}).timeout(60000)

		it("replaces its precompiler when a module an import resolves to is created", () => {
			const dir = tempDir()
			writeFileSync(
				join(dir, "main.ts"),
				'import { type } from "arktype"\nimport { shape } from "./shape.js"\n\nexport const T = type(shape)\n'
			)
			attest(loadIn(dir)).satisfies(/cannot be precompiled/)
			writeFileSync(
				join(dir, "shape.ts"),
				'export const shape = { a: "number" } as const\n'
			)
			attest(loadIn(dir).includes('"number"')).equals(true)
		}).timeout(60000)

		it("replaces its precompiler when a module is created beside the directory an import resolved to", () => {
			const dir = tempDir()
			writeFileSync(
				join(dir, "main.ts"),
				'import { type } from "arktype"\nimport { shape } from "./shape"\n\nexport const T = type(shape)\n'
			)
			mkdirSync(join(dir, "shape"))
			writeFileSync(
				join(dir, "shape", "index.ts"),
				'export const shape = { a: "string" } as const\n'
			)
			attest(loadIn(dir).includes('"number"')).equals(false)
			writeFileSync(
				join(dir, "shape.ts"),
				'export const shape = { a: "number" } as const\n'
			)
			attest(loadIn(dir).includes('"number"')).equals(true)
		}).timeout(60000)

		it("replaces its precompiler when the paths an import resolves through change", () => {
			const dir = tempDir()
			const writeTsconfig = (target: string) =>
				writeFileSync(
					join(dir, "tsconfig.json"),
					JSON.stringify({ compilerOptions: { paths: { "#shape": [target] } } })
				)
			writeFileSync(
				join(dir, "main.ts"),
				'import { type } from "arktype"\nimport { shape } from "#shape"\n\nexport const T = type(shape)\n'
			)
			writeFileSync(
				join(dir, "a.ts"),
				'export const shape = { a: "string" } as const\n'
			)
			writeFileSync(
				join(dir, "b.ts"),
				'export const shape = { a: "number" } as const\n'
			)
			writeTsconfig("./a.ts")
			attest(loadIn(dir).includes('"number"')).equals(false)
			writeTsconfig("./b.ts")
			attest(loadIn(dir).includes('"number"')).equals(true)
		}).timeout(60000)

		it("replaces its precompiler when a module an aliased import resolves to is created", () => {
			const dir = tempDir()
			writeFileSync(
				join(dir, "tsconfig.json"),
				JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } })
			)
			writeFileSync(
				join(dir, "main.ts"),
				'import { type } from "arktype"\nimport { shape } from "@/shape"\n\nexport const T = type(shape)\n'
			)
			attest(loadIn(dir)).satisfies(/cannot be precompiled/)
			writeFileSync(
				join(dir, "shape.ts"),
				'export const shape = { a: "number" } as const\n'
			)
			attest(loadIn(dir).includes('"number"')).equals(true)
		}).timeout(60000)

		it("replaces its precompiler when a module it transformed changes", () => {
			const dir = tempDir()
			writeFileSync(
				join(dir, "main.ts"),
				'import { type } from "arktype"\nimport { shape } from "./shape.ts"\n\nexport const T = type(shape)\n'
			)
			const writeShape = (domain: string, at: Date) => {
				writeFileSync(
					join(dir, "shape.ts"),
					`import { type } from "arktype"\n\nexport const shape = { a: "${domain}" } as const\n\nexport const Shape = type(shape)\n`
				)
				utimesSync(join(dir, "shape.ts"), at, at)
			}
			writeShape("string", new Date(0))
			loadIn(dir, "shape.ts")
			attest(loadIn(dir).includes('"number"')).equals(false)
			writeShape("number", new Date())
			attest(loadIn(dir).includes('"number"')).equals(true)
		}).timeout(60000)

		it("reports dependencies before a rejected site's error", () => {
			const roles = load("roles.ts")
			attest(() => roles.run()).throws(
				'roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: `\'${proces… cannot be precompiled'
			)
			attest(roles.dependencies).equals(["schemas.ts", "ark.ts", tsconfig])
		}).timeout(60000)
	})

	// Bun is optional, so its tests run where it is installed
	if (bun(["--version"]).status !== 0) return

	describe("bun", () => {
		const preload = [
			"--conditions",
			"ark-ts",
			"--preload",
			join(app, "preload.ts")
		]

		it("standalone", () => {
			attest(bun([...preload, "main.ts"]).stdout).equals(expected)
		}).timeout(60000)

		it("cache", () => {
			attest(bun([...preload, "main.ts"], "arktype").stdout).equals(expected)
		}).timeout(60000)

		it("import cycle", () => {
			attest(bun([...preload, "main.ts"], undefined, cycle).stdout).equals(
				runPlain(cycle)
			)
		}).timeout(60000)

		it("configured", () => {
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					bun([...preload, "main.ts"], runtime, configured, "config.ts").stdout
				).equals(runPlain(configured))
			}
		}).timeout(60000)

		it("bun test", () => {
			for (const runtime of [undefined, "arktype"] as const) {
				const result = bun(["test", ...preload, "./app.spec.ts"], runtime)
				attest([result.status, result.stderr.match(/\d+ pass/)?.[0]]).equals([
					0,
					"2 pass"
				])
			}
		}).timeout(60000)

		it("packages that opt in", () => {
			for (const runtime of [undefined, "arktype"] as const) {
				const result = bun(
					[
						"test",
						"--conditions",
						"ark-ts",
						"--preload",
						join(app, "preload.ts"),
						"./tagged.spec.ts"
					],
					runtime,
					library
				)
				attest([result.status, result.stderr.match(/\d+ pass/)?.[0]]).equals([
					0,
					"1 pass"
				])
			}
		}).timeout(60000)

		it("checks static helpers under bun test", () => {
			const result = bun(
				[
					"test",
					"--conditions",
					"ark-ts",
					"--preload",
					join(app, "preload.ts"),
					"./bun.check.ts"
				],
				undefined,
				checks
			)
			attest([result.status, result.stderr.match(/\d+ pass/)?.[0]]).equals([
				0,
				"2 pass"
			])
		}).timeout(60000)

		it("runtime islands", () => {
			attest(
				bun([...preload, "main.ts"], undefined, islands, "config.ts").stdout
			).equals(runPlain(islands))
		}).timeout(60000)

		it("runs a program without error detail on a runtime of its own, which @ark/schema doesn't load beside", () => {
			attest(
				bun([...preload, "main.ts"], undefined, undetailed, "", "none").stdout
			).equals(undetailedOutput)
			const { status, stderr } = bun(
				[...preload, "main.ts"],
				undefined,
				join(undetailed, "reads"),
				"",
				"none"
			)
			attest(status).equals(1)
			attest(
				stderr.includes(writeUndetailedImportMessage("a module", "@ark/schema"))
			).equals(true)
		}).timeout(60000)

		it("fails a module with a rejected site", () => {
			const { status, stderr } = bun([...preload, "roles.ts"])
			attest(status).equals(1)
			attest(
				stderr
					.slice(stderr.indexOf("error: ") + 7, stderr.indexOf("\n      at "))
					.replace(`${app}/`, "")
			)
				.snap(`roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: \`'\${proces… cannot be precompiled
  \`process\` is a global the build does not read
  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`)
		}).timeout(60000)
	})
})
