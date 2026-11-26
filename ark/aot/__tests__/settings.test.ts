import { attest, contextualize } from "@ark/attest"
import { check } from "@ark/aot/internal/check.ts"
import { optedInPackagesOf } from "@ark/aot/internal/host.ts"
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
import { ArkJson, ArkJsonSchema } from "./settingsSchema.ts"
import { writeFixture } from "./utils.ts"
import { writeSettingsFiles } from "./writeSettings.ts"

const stripDescriptions = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(stripDescriptions)
	if (typeof value === "object" && value !== null) {
		const out: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(value))
			if (k !== "description") out[k] = stripDescriptions(v)
		return out
	}
	return value
}

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
			const [{ resolveId }] = precompile.raw(
				{ cwd: root },
				{
					framework: "webpack",
					webpack: { compiler: {} as never },
					versions: {}
				}
			) as unknown as [
				{ resolveId: { handler: (...args: unknown[]) => Promise<unknown> } }
			]
			const reported: string[] = []
			await resolveId.handler.call(
				{ error: (message: string) => reported.push(message) },
				"arktype/schema",
				importer
			)
			attest(reported).equals([
				writeVariantImportMessage(importer, "arktype/schema", "lean")
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

		it("leaves a library's aot to ark.json's options", () => {
			const root = withArk(
				{ aot: true },
				{
					"ark.json": JSON.stringify({
						$schema: "node_modules/@ark/aot/ark.schema.json",
						precompile: { config: "src/config.ts" }
					})
				}
			)
			attest(withSettingsFile({ cwd: root })).snap({
				config: join(root, "src", "config.ts"),
				cwd: root
			} as never)
		})

		it("fails setting precompile beside ark.json", () => {
			const root = withArk(
				{ aot: true, precompile: {} },
				{ "ark.json": JSON.stringify({ precompile: {} }) }
			)
			attest(() => withSettingsFile({ cwd: root })).throws(
				`${join(root, "package.json")} sets "ark.precompile" and ${join(root, "ark.json")} is beside it, so the build can't tell which sets its options. Beside ark.json, "ark" may set only "aot": move "precompile" from one file to the other.`
			)
		})

		it("names a key it rejects beside ark.json", () => {
			const root = withArk(
				{ aot: true, optimize: "size" },
				{ "ark.json": JSON.stringify({ precompile: {} }) }
			)
			attest(() => withSettingsFile({ cwd: root })).throws(
				`${join(root, "package.json")}: ark.optimize must be set in precompile`
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
		const schema = JSON.parse(
			readFileSync(join(import.meta.dirname, "..", "ark.schema.json"), "utf8")
		) as {
			description?: string
			properties: {
				$schema: { description?: string }
				precompile: {
					description?: string
					properties: Record<
						string,
						{
							description?: string
							properties?: Record<string, { description?: string }>
						}
					>
				}
			}
		}
		attest(Boolean(schema.description)).equals(true)
		attest(Boolean(schema.properties.$schema.description)).equals(true)
		attest(Boolean(schema.properties.precompile.description)).equals(true)
		const missingDescriptions: string[] = []
		for (const [key, prop] of Object.entries(
			schema.properties.precompile.properties
		)) {
			if (!prop.description) missingDescriptions.push(key)
			for (const [subKey, subProp] of Object.entries(prop.properties ?? {}))
				if (!subProp.description) missingDescriptions.push(`${key}.${subKey}`)
		}
		attest(missingDescriptions).equals([])
		// ArkJsonSchema must stay structurally identical to ArkJson aside from descriptions
		attest(stripDescriptions(ArkJsonSchema.toJsonSchema())).equals(
			stripDescriptions(ArkJson.toJsonSchema())
		)
	})

	it("accepts a UTF-8 BOM in package.json and ark.json, and warns on an unparseable dependency manifest", () => {
		const root = writeFixture({
			"package.json": `\uFEFF${JSON.stringify({
				name: "bom-app",
				type: "module",
				dependencies: { "bom-dep": "1.0.0", "bad-dep": "1.0.0" }
			})}`,
			"ark.json": `\uFEFF${JSON.stringify({ precompile: { errors: "first" } })}`,
			"node_modules/bom-dep/package.json": `\uFEFF${JSON.stringify({
				name: "bom-dep",
				ark: { aot: true }
			})}`,
			"node_modules/bad-dep/package.json": "{not json"
		})
		attest(withSettingsFile({ cwd: root })).snap({
			errors: "first",
			cwd: root
		} as never)
		const warnings: string[] = []
		attest(optedInPackagesOf(root, undefined, w => warnings.push(w))).equals([
			"bom-dep"
		])
		// the parse error is the runtime's own wording
		attest(
			warnings.map(warning =>
				warning.replace(
					/isn't JSON: .*; ignoring/,
					"isn't JSON: <parse error>; ignoring"
				)
			)
		).equals([
			`precompile: ${join(root, "node_modules", "bad-dep", "package.json")} isn't JSON: <parse error>; ignoring it for dependency precompilation`
		])
	})
})
