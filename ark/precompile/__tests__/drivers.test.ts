import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import turbopack from "@ark/precompile/turbopack"
import type { PrecompilePluginOptions } from "@ark/precompile/unplugin"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { writeCreatedBeforeConfigureMessage } from "@ark/schema/runtime"
import { writeLibrary } from "./utils.ts"

const app = fromHere("app")

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

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
		{ cwd, encoding: "utf8" }
	)

// options reach the plugin in app/preload.ts through the environment
const bun = (args: string[], runtime?: "arktype", cwd = app, config = "") => {
	// `bun test` sets NODE_ENV only if it isn't set, as a bundler run earlier in this process may have set it
	const { NODE_ENV, ...env } = process.env
	return spawnSync("bun", args, {
		cwd,
		encoding: "utf8",
		env: { ...env, ARKTYPE_RUNTIME: runtime ?? "", ARKTYPE_CONFIG: config }
	})
}

const islands = fromHere("islands")

const configured = fromHere("configured")

const localized = fromHere("localized")

const checks = fromHere("checks")

const writers = fromHere("writers")

const library = writeLibrary()

const runPlain = (cwd: string, entry = "main.ts") =>
	spawnSync(process.execPath, ["--conditions", "ark-ts", entry], {
		cwd,
		encoding: "utf8"
	}).stdout

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

	describe("node", () => {
		it("standalone", () => {
			attest(node(["main.ts"], {}).stdout).equals(expected)
		}).timeout(60000)

		it("cache", () => {
			attest(node(["main.ts"], { runtime: "arktype" }).stdout).equals(expected)
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
				.snap(`roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: "'admin'" … can't be precompiled to a standalone validator yet
  \`User\` is imported from schemas.ts, which only a Type's factory can compare yet
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
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

		it("packages that opt in", () => {
			attest(node(["main.ts"], {}, library).stdout).equals(runPlain(library))
		}).timeout(60000)

		it("configured", () => {
			for (const runtime of [undefined, "arktype"] as const) {
				attest(
					node(["main.ts"], { runtime, config: "config.ts" }, configured).stdout
				).equals(runPlain(configured))
			}
		}).timeout(60000)

		it("configured before a Type created where it's defined is", () => {
			const opts = { config: "config.ts" }
			attest(node(["later.ts"], opts, configured).stdout).equals(
				runPlain(configured, "later.ts")
			)
			attest(
				node(["unconfigured.ts"], opts, configured).stderr.includes(
					writeCreatedBeforeConfigureMessage("schemas.ts")
				)
			).equals(true)
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
			)
				.snap(`main.ts:4:18  type("string") can't be precompiled to a standalone validator yet
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
				.snap(`main.ts:6:21  type("string").narrow(isLong) can't be precompiled to a standalone validator yet
  \`node.expression\` (config.ts:5:38) prints the name of \`isLong\` (main.ts:4:16), which the build knows only by a placeholder
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
			attest(standalone.run()).satisfies(/^const { "v\w+": \$ark\w+,/)
			attest(standalone.dependencies).equals(["ark.ts"])
			attest(load("schemas.ts", { runtime: "arktype" }).run()).satisfies(
				/^;\(\({ "registerPrecompiledUnits": /
			)
		}).timeout(60000)

		it("shares a configuration with the precompiler it replaces", () => {
			const transform = `turbopack.call({
	resourcePath: ${JSON.stringify(join(configured, "main.ts"))},
	getOptions: () => (${JSON.stringify({ config: "config.ts", conditions, cwd: configured })}),
	addDependency: () => {},
	emitWarning: warning => { throw warning }
}, readFileSync("main.ts", "utf8"))`
			const { stdout } = spawnSync(
				process.execPath,
				["--conditions", "ark-ts", "--input-type=module"],
				{
					cwd: configured,
					encoding: "utf8",
					// a file the precompiler read changes, so the loader replaces it
					input: `import turbopack from "${pathToFileURL(fromHere("..", "turbopack.ts"))}"
import { readFileSync, utimesSync } from "node:fs"
const first = ${transform}
utimesSync("config.ts", new Date(), new Date())
console.log(first === ${transform}, /fixConfig\\("\\w+", "main.ts"\\)/.test(first))`
				}
			)
			attest(stdout).equals("true true\n")
		}).timeout(60000)

		it("reports dependencies before a rejected site's error", () => {
			const roles = load("roles.ts")
			attest(() => roles.run()).throws(
				'roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: "\'admin\'" … can\'t be precompiled to a standalone validator yet'
			)
			attest(roles.dependencies).equals(["schemas.ts", "ark.ts"])
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

		it("fails a module with a rejected site", () => {
			const { status, stderr } = bun([...preload, "roles.ts"])
			attest(status).equals(1)
			attest(
				stderr
					.slice(stderr.indexOf("error: ") + 7, stderr.indexOf("\n      at "))
					.replace(`${app}/`, "")
			)
				.snap(`roles.ts:4:22  scope({ user: User, admin: ["user", "&", { role: "'admin'" … can't be precompiled to a standalone validator yet
  \`User\` is imported from schemas.ts, which only a Type's factory can compare yet
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
		}).timeout(60000)
	})
})
