import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { PrecompilePluginOptions, TransformedModule } from "./driver.ts"
import {
	appendSourceMap,
	createDevelopmentHost,
	createNodeHost,
	driverOptionsOf,
	optedInPackagesOf,
	reportDiagnostics,
	resolvesToRuntime,
	resolvedVariantOf,
	runtimeSpecifiers,
	transformedFilterOf,
	writeVariantImportMessage
} from "./host.ts"
import { refuseDeclare } from "./declare.ts"
import { isProductionEnv } from "./presets.ts"
import {
	refuseArktypeDependencies,
	refusePrune,
	resolvePrecompileOptions,
	withSettingsFile
} from "./settings.ts"
import { createAsyncPrecompiler } from "./worker.ts"

// declared here, since bun-types declares globals beside @types/node's
export interface BunPluginBuilder {
	module(
		specifier: string,
		load: () => { contents: string; loader: "js" }
	): void
	onLoad(
		constraints: { filter: RegExp },
		load: (args: { path: string }) => Promise<{ contents: string }>
	): void
}

export interface BunPlugin {
	name: string
	setup(build: BunPluginBuilder): void
}

export const precompile = (opts?: PrecompilePluginOptions): BunPlugin => {
	refuseDeclare(opts, "Bun")
	const set = withSettingsFile(opts)
	refusePrune(set, "Bun")
	refuseArktypeDependencies(set, "Bun's runtime plugin")
	opts = resolvePrecompileOptions(set)
	return {
		name: "arktype",
		setup: build => {
			const cwd = opts?.cwd ?? process.cwd()
			if (opts?.runtime !== "arktype") {
				// a runtime plugin replaces a package for every importer, with the
				// runtime a development build resolves, so Bun prints errors as issues
				const host =
					isProductionEnv() ? createNodeHost(opts) : createDevelopmentHost(opts)
				const runtime = host.resolve(
					"arktype/runtime",
					join(cwd, "package.json")
				)
				for (const specifier of [...runtimeSpecifiers, "arktype/runtime"]) {
					if (!resolvesToRuntime(specifier, opts)) continue
					build.module(specifier, () => ({
						contents: `export * from ${JSON.stringify(runtime)}`,
						loader: "js"
					}))
				}
				const variant = resolvedVariantOf(opts)
				if (variant) {
					build.module("@ark/schema/runtime", () => ({
						contents: `export * from ${JSON.stringify(host.resolve(`@ark/schema/runtime/${variant}`, runtime!))}`,
						loader: "js"
					}))
					// throws once linked, as Bun names no importer
					build.module("@ark/schema", () => ({
						contents: `export * from ${JSON.stringify(host.resolve("@ark/schema", runtime!))}\nthrow new Error(${JSON.stringify(writeVariantImportMessage("a module", "@ark/schema", variant))})`,
						loader: "js"
					}))
				}
			}
			const served = new Set<string>()
			const request = createAsyncPrecompiler({
				// set by `bun test`
				precompilerOptions: driverOptionsOf(
					set,
					process.env.NODE_ENV === "test"
				)
			})
			const { include, exclude } = transformedFilterOf(
				optedInPackagesOf(cwd, opts?.dependencies)
			)
			// a runtime plugin's onLoad must return a module
			const filter = new RegExp(`^(?!.*${exclude.source}).*${include.source}`)
			build.onLoad({ filter }, async ({ path }) => {
				const source = readFileSync(path, "utf8")
				const transformed = (await request(["transform", source, path])) as
					| TransformedModule
					| undefined
				reportDiagnostics(transformed, warning => console.warn(warning))
				if (!transformed?.code) return { contents: source }
				for (const specifier in transformed.modules) {
					if (served.has(specifier)) continue
					served.add(specifier)
					const contents = transformed.modules[specifier]
					build.module(specifier, () => ({ contents, loader: "js" }))
				}
				return { contents: appendSourceMap(transformed.code, transformed.map) }
			})
		}
	}
}
