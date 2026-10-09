import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { standaloneConfigurationMessage } from "@ark/precompile"
import { createTransformer } from "@ark/precompile/jest"
import turbopack from "@ark/precompile/turbopack"
import type { PrecompilePluginOptions } from "@ark/precompile/unplugin"
import { spawnSync } from "node:child_process"
import {
	mkdtempSync,
	readFileSync,
	realpathSync,
	utimesSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

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

const bun = (args: string[], runtime?: "arktype") =>
	spawnSync("bun", args, {
		cwd: app,
		encoding: "utf8",
		env: { ...process.env, ARKTYPE_RUNTIME: runtime ?? "" }
	})

contextualize(() => {
	const expected = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", "main.ts"],
		{ cwd: app, encoding: "utf8" }
	).stdout

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

		it("precompiles apart from the program", () => {
			const result = node(
				["main.ts"],
				{ runtime: "arktype", config: "config.ts" },
				fromHere("configured")
			)
			attest(result.stdout).equals("true\n")
		}).timeout(60000)
	})
	describe("jest", () => {
		const options = { configString: "{}" }

		const transform = (path: string, transformer = createTransformer()) => {
			const source = readFileSync(path, "utf8")
			return [
				transformer.getCacheKey(source, path, options),
				transformer.process(source, path, options).code
			]
		}

		it("precompiles a module in either mode", () => {
			const schemas = join(app, "schemas.ts")
			attest(
				transform(schemas, createTransformer({ conditions }))[1]
			).satisfies(/^const { "v\w+": \$ark\w+,/)
			attest(
				transform(
					schemas,
					createTransformer({ conditions, runtime: "arktype" })
				)[1]
			).satisfies(/^;\(\({ "registerPrecompiledUnits": /)
		}).timeout(60000)

		it("keys a module by the files in its forward closure", () => {
			const root = realpathSync(mkdtempSync(join(tmpdir(), "ark-jest-")))
			const write = (file: string, contents: string, time: number) => {
				writeFileSync(join(root, file), contents)
				utimesSync(join(root, file), time, time)
			}
			write(
				"main.ts",
				'import { b } from "./b.ts"\nexport const B = b.array()\n',
				1
			)
			write("b.ts", "export const b = 1\n", 1)
			write("other.ts", "export const other = 1\n", 1)
			const transformer = createTransformer({ cwd: root, runtime: "arktype" })
			const main = join(root, "main.ts")
			const [unchangedKey, unchanged] = transform(main, transformer)
			write("other.ts", "export const other = 2\n", 2)
			attest(transform(main, transformer)[0]).equals(unchangedKey)
			write(
				"b.ts",
				'import { type } from "arktype"\nexport const b = type("string")\n',
				3
			)
			const [key, code] = transform(main, transformer)
			attest(key === unchangedKey).equals(false)
			attest([unchanged, code].map(text => text.includes("$ark"))).equals([
				false,
				true
			])
		}).timeout(60000)

		it("passes the precompiled module to another transformer", () => {
			const root = realpathSync(mkdtempSync(join(tmpdir(), "ark-jest-")))
			writeFileSync(
				join(root, "next.cjs"),
				"exports.createTransformer = banner => ({ process: code => ({ code: banner + code }), getCacheKey: () => banner })\n"
			)
			const transformer = createTransformer({
				conditions,
				cwd: root,
				transformer: ["./next.cjs", "// next\n"]
			})
			const [key, code] = transform(join(app, "schemas.ts"), transformer)
			attest(code).satisfies(/^\/\/ next\nconst { "v/)
			attest(key === transform(join(app, "schemas.ts"))[0]).equals(false)
		}).timeout(60000)

		it("throws for configuration in standalone mode", () => {
			attest(() =>
				transform(
					join(app, "main.ts"),
					createTransformer({ config: "config.ts" })
				)
			).throws(standaloneConfigurationMessage)
		}).timeout(60000)

		it("throws for a rejected site", () => {
			attest(() =>
				transform(
					join(app, "admin.ts"),
					createTransformer({ conditions, cwd: app })
				)
			).throws(
				"admin.ts:3:22  User.and({ role: \"'admin'\" }) can't be precompiled to a standalone validator yet"
			)
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
