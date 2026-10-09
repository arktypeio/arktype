import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import turbopack from "@ark/precompile/turbopack"
import type { PrecompilePluginOptions } from "@ark/precompile/unplugin"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
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

const bun = (args: string[], runtime?: "arktype", cwd = app) =>
	spawnSync("bun", args, {
		cwd,
		encoding: "utf8",
		env: { ...process.env, ARKTYPE_RUNTIME: runtime ?? "" }
	})

const islands = fromHere("islands")

const library = writeLibrary()

const runPlain = (cwd: string) =>
	spawnSync(process.execPath, ["--conditions", "ark-ts", "main.ts"], {
		cwd,
		encoding: "utf8"
	}).stdout

contextualize(() => {
	const expected = runPlain(app)

	describe("node", () => {
		it("standalone", () => {
			attest(node(["main.ts"], {}).stdout).equals(expected)
		}).timeout(60000)

		it("cache", () => {
			attest(node(["main.ts"], { runtime: "arktype" }).stdout).equals(expected)
		}).timeout(60000)

		it("fails a test file with a rejected site", () => {
			const { status, stdout } = node(["--test", "admin.ts", "main.ts"], {})
			attest(status).equals(1)
			attest(
				stdout
					.match(/^. (?:admin|main)\.ts/gm)
					?.slice(0, 2)
					.sort()
			).equals(["✔ main.ts", "✖ admin.ts"])
			attest(
				stdout
					.slice(stdout.indexOf("Error: ") + 7, stdout.indexOf("\n    at "))
					.replace(`${app}/`, "")
			)
				.snap(`admin.ts:3:22  User.and({ role: "'admin'" }) can't be precompiled to a standalone validator yet
  \`User\` is imported from schemas.ts
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
		}).timeout(60000)

		it("runtime islands", () => {
			attest(node(["main.ts"], {}, islands).stdout).equals(runPlain(islands))
		}).timeout(60000)

		it("packages that opt in", () => {
			attest(node(["main.ts"], {}, library).stdout).equals(runPlain(library))
		}).timeout(60000)

		it("precompiles apart from the program", () => {
			const result = node(
				["main.ts"],
				{ runtime: "arktype", config: "config.ts" },
				fromHere("configured")
			)
			attest(result.stdout).equals("true\n")
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

		it("reports dependencies before a rejected site's error", () => {
			const admin = load("admin.ts")
			attest(() => admin.run()).throws(
				"admin.ts:3:22  User.and({ role: \"'admin'\" }) can't be precompiled to a standalone validator yet"
			)
			attest(admin.dependencies).equals(["schemas.ts", "ark.ts"])
		}).timeout(60000)
	})

	// Bun is optional, so its tests run where it is installed
	if (bun(["--version"]).status !== 0) return

	describe("bun", () => {
		const preload = ["--conditions", "ark-ts", "--preload", "./preload.ts"]

		it("standalone", () => {
			attest(bun([...preload, "main.ts"]).stdout).equals(expected)
		}).timeout(60000)

		it("cache", () => {
			attest(bun([...preload, "main.ts"], "arktype").stdout).equals(expected)
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

		it("runtime islands", () => {
			attest(
				bun(
					[
						"--conditions",
						"ark-ts",
						"--preload",
						join(app, "preload.ts"),
						"main.ts"
					],
					undefined,
					islands
				).stdout
			).equals(runPlain(islands))
		}).timeout(60000)

		it("fails a module with a rejected site", () => {
			const { status, stderr } = bun([...preload, "admin.ts"])
			attest(status).equals(1)
			attest(
				stderr
					.slice(stderr.indexOf("error: ") + 7, stderr.indexOf("\n      at "))
					.replace(`${app}/`, "")
			)
				.snap(`admin.ts:3:22  User.and({ role: "'admin'" }) can't be precompiled to a standalone validator yet
  \`User\` is imported from schemas.ts
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
		}).timeout(60000)
	})
})
