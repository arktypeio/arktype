import { attest, contextualize } from "@ark/attest"
import {
	resolvePrecompileOptions,
	withEnvironment,
	withSettingsFile,
	writeArktypeRuntimeOptionMessage,
	writeVariantImportMessage
} from "@ark/precompile"
import { precompile } from "@ark/precompile/unplugin"
import { check } from "@ark/precompile/internal/check.ts"
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
				checks: "none",
				config: false,
				freeze: true,
				preset: "smallest"
			} as never)
		})

		it("checks helpers in tests", () => {
			attest(withEnvironment({}, { production: false, testing: true })).snap({
				checks: "helpers"
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

	// `pnpm writePrecompileSettings` rewrites them
	it("validators match their schema", async () => {
		const files = await writeSettingsFiles()
		for (const path in files)
			attest(readFileSync(path, "utf8")).equals(files[path])
	})
})
