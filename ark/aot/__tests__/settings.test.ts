import { attest, contextualize } from "@ark/attest"
import { check } from "@ark/aot/internal/check.ts"
import { writeVariantImportMessage } from "@ark/aot/internal/messages.ts"
import { withEnvironment } from "@ark/aot/internal/presets.ts"
import {
	refuseArktypeDependencies,
	resolvePrecompileOptions,
	withSettingsFile,
	writeArktypeRuntimeOptionMessage
} from "@ark/aot/internal/settings.ts"
import { precompile } from "@ark/aot/unplugin"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { writeFixture } from "./utils.ts"
import { writeSettingsFiles } from "./writeSettings.ts"

const withArkJson = (json: object, files: Record<string, string> = {}) =>
	writeFixture({
		"package.json": "{}",
		"ark.json": JSON.stringify(json),
		...files
	})

contextualize(() => {
	describe("presets", () => {
		it("sets what nothing else does", () => {
			attest(resolvePrecompileOptions({ preset: "smallest" })).snap({
				optimize: "size",
				lazy: false,
				optimizeErrors: "size"
			})
			attest(
				resolvePrecompileOptions({
					preset: "introspectable",
					members: { json: false, assert: false }
				}).members
			).snap({
				expression: true,
				description: true,
				json: false,
				toJSON: true,
				toJsonSchema: true,
				"~standard.jsonSchema": true,
				assert: false
			})
		})

		it("writes errors as validators unless set apart", () => {
			attest(
				resolvePrecompileOptions({ preset: "smallest", optimize: "speed" })
					.optimizeErrors
			).equals("speed")
			attest(
				resolvePrecompileOptions({
					preset: "smallest",
					optimizeErrors: "speed"
				})
			).snap({ optimize: "size", lazy: false, optimizeErrors: "speed" })
		})

		it("leaves runtime arktype nothing of a preset", () => {
			attest(
				resolvePrecompileOptions({ preset: "smallest", runtime: "arktype" })
			).snap({ runtime: "arktype" })
			attest(() =>
				resolvePrecompileOptions({ runtime: "arktype", optimizeErrors: "size" })
			).throws(writeArktypeRuntimeOptionMessage("optimizeErrors"))
		})
	})

	describe("environment", () => {
		it("leaves runtime checks out of a production build", () => {
			attest(
				withEnvironment(
					{ preset: "smallest", freeze: true },
					{ production: true, testing: false }
				)
			).snap({
				config: false,
				creationChecks: "none",
				freeze: true,
				preset: "smallest"
			} as never)
		})

		it("checks helpers in tests", () => {
			attest(withEnvironment({}, { production: false, testing: true })).snap({
				creationChecks: "helpers"
			})
			attest(
				withEnvironment(
					{ runtime: "arktype" },
					{ production: true, testing: true }
				)
			).snap({ runtime: "arktype" })
		})
	})

	describe("ark.json", () => {
		it("sets what the call doesn't", () => {
			const root = withArkJson({
				precompile: {
					preset: "smallest",
					config: "src/config.ts",
					members: { meta: false, assert: false }
				}
			})
			attest(
				withSettingsFile({
					cwd: join(root, "src"),
					config: undefined,
					members: { assert: true }
				})
			).snap({
				preset: "smallest",
				config: join(root, "src", "config.ts"),
				members: { meta: false, assert: true },
				cwd: join(root, "src")
			} as never)
		})

		it("is read only beside the nearest package.json", () => {
			const root = withArkJson(
				{ precompile: { optimize: "size" } },
				{ "app/package.json": "{}" }
			)
			attest(withSettingsFile({ cwd: join(root, "app") })).snap({
				cwd: join(root, "app")
			} as never)
		})

		it("names the file and key it rejects", () => {
			const root = withArkJson({
				precompile: { optimize: "small", members: { errorMethods: false } }
			})
			const path = join(root, "ark.json")
			attest(() => withSettingsFile({ cwd: root })).throws(
				`${path}: precompile.members.errorMethods must be removed (was false)\n${path}: precompile.optimize must be "size" or "speed" (was "small")`
			)
			const unparsed = writeFixture({ "package.json": "{}", "ark.json": "{" })
			attest(() => withSettingsFile({ cwd: unparsed })).throws(
				`${join(unparsed, "ark.json")} isn't JSON`
			)
		})

		it("names an option set beside precompile", () => {
			const root = withArkJson({ members: { toJsonSchema: true } })
			attest(() => withSettingsFile({ cwd: root })).throws(
				`${join(root, "ark.json")}: members must be set in precompile, as in {"precompile":{"members":{"toJsonSchema":true}}}`
			)
		})

		it("configures what the plugin resolves", async () => {
			const root = withArkJson({ precompile: { preset: "smallest" } })
			const importer = join(root, "main.ts")
			const { resolveId } = precompile.raw(
				{ cwd: root },
				{
					framework: "webpack",
					webpack: { compiler: {} as never },
					versions: {}
				}
			) as { resolveId: { handler: (...args: unknown[]) => Promise<unknown> } }
			const reported: string[] = []
			await resolveId.handler.call(
				{ error: (message: string) => reported.push(message) },
				"@ark/schema",
				importer
			)
			attest(reported).equals([
				writeVariantImportMessage(importer, "@ark/schema", "lean")
			])
		})

		it("configures what the build reports", () => {
			const root = withArkJson(
				{ precompile: { members: { assert: false } } },
				{
					"main.ts": `import { type } from "arktype"\nconst T = type("string")\nT.assert("")\n`
				}
			)
			attest(check([], { cwd: root }).lines[1]).snap(
				'main.ts:3:1  T.assert reads assert, which a standalone validator lacks\n  the build\'s `members` option sets "assert" false, so no validator has assert\n  Leave members["assert"] unset if the program reads it.'
			)
		})
	})

	describe(`package.json's "ark" key`, () => {
		const withArk = (ark: object, files: Record<string, string> = {}) =>
			writeFixture({
				"package.json": JSON.stringify({ name: "app", ark }),
				...files
			})

		it("sets what ark.json would", () => {
			const root = withArk({
				aot: true,
				precompile: { config: "src/config.ts", members: { assert: false } }
			})
			attest(withSettingsFile({ cwd: join(root, "src") })).snap({
				config: join(root, "src", "config.ts"),
				members: { assert: false },
				cwd: join(root, "src")
			} as never)
		})

		it("names the file and key it rejects", () => {
			const root = withArk({ aot: false, precompile: { optimize: "small" } })
			const path = join(root, "package.json")
			attest(() => withSettingsFile({ cwd: root })).throws(
				`${path}: ark.precompile.optimize must be "size" or "speed" (was "small")\n${path}: ark.aot must be true (was false)`
			)
		})

		it("fails beside ark.json", () => {
			const root = withArk(
				{ precompile: {} },
				{ "ark.json": JSON.stringify({ precompile: {} }) }
			)
			attest(() => withSettingsFile({ cwd: root })).throws(
				`${join(root, "package.json")} sets "ark" and ${join(root, "ark.json")} is beside it, so the build can't tell which sets its options. Move ark.json's contents under package.json's "ark" key, or delete that key.`
			)
		})
	})

	describe("dependencies", () => {
		it("merges the call's over the file's, by name", () => {
			const root = withArkJson(
				{ precompile: { dependencies: { a: "aot", b: "aot" } } },
				{
					"node_modules/a/package.json": "{}",
					"node_modules/b/package.json": "{}"
				}
			)
			attest(
				withSettingsFile({ cwd: root, dependencies: { b: "arktype" } })
					.dependencies
			).equals({ a: "aot", b: "arktype" } as never)
		})

		it("names one the program can't resolve", () => {
			const root = withArkJson({
				precompile: { dependencies: { "drizzle-arktyp": "arktype" } }
			})
			attest(() => withSettingsFile({ cwd: root })).throws(
				`precompile.dependencies names drizzle-arktyp, which can't be resolved from ${root}. Name a package the program depends on.`
			)
		})

		it("runs none on arktype where errors have a runtime of their own", () => {
			const dependencies = { tables: "arktype" } as const
			attest(() =>
				resolvePrecompileOptions({ dependencies, errors: "none" })
			).throws(
				'tables runs on arktype, whose errors aren\'t instances of type.errors under errors: "none". Precompile it with "aot" if its Types are static, or build without errors: "none".'
			)
			attest(() =>
				resolvePrecompileOptions({ dependencies, preset: "smallest" })
			).throws(
				'tables runs on arktype, whose errors aren\'t instances of type.errors under optimizeErrors: "size". Precompile it with "aot" if its Types are static, or build with optimizeErrors: "speed".'
			)
			attest(() =>
				resolvePrecompileOptions({ dependencies, runtime: "arktype" })
			).throws(writeArktypeRuntimeOptionMessage("dependencies"))
		})

		it("runs none on arktype where every importer's arktype is replaced", () => {
			attest(() =>
				refuseArktypeDependencies(
					{ dependencies: { tables: "arktype", lib: "aot" } },
					"Turbopack"
				)
			).throws(
				'precompile.dependencies runs tables on arktype, which Turbopack can\'t, as it replaces arktype for every importer. Set it to "aot" if its Types are static, or build with webpack (next build --webpack), or with runtime: "arktype".'
			)
			attest(() =>
				refuseArktypeDependencies(
					{ dependencies: { tables: "arktype" } },
					"Bun's runtime plugin"
				)
			).throws(
				'precompile.dependencies runs tables on arktype, which Bun\'s runtime plugin can\'t, as it replaces arktype for every importer. Set it to "aot" if its Types are static, or build with Bun.build and precompile.bun(), or with runtime: "arktype".'
			)
		})
	})

	// `pnpm writePrecompileSettings` rewrites them
	it("validators match their schema", async () => {
		const files = await writeSettingsFiles()
		for (const path in files)
			attest(readFileSync(path, "utf8")).equals(files[path])
	})
})
