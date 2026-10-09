import { throwError } from "@ark/util"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { InlineModule, PrecompilePluginOptions } from "./driver.ts"
import {
	createNodeHost,
	optedInPackagesOf,
	transformedFilterOf
} from "./host.ts"
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

export const precompile = (opts?: PrecompilePluginOptions): BunPlugin => ({
	name: "arktype",
	setup: build => {
		if (opts?.runtime !== "arktype") {
			// a runtime plugin isn't asked to resolve a package, so arktype is replaced for every importer
			const runtime = createNodeHost(opts).resolve(
				"arktype/runtime",
				join(opts?.cwd ?? process.cwd(), "package.json")
			)
			build.module("arktype", () => ({
				contents: `export * from ${JSON.stringify(runtime)}`,
				loader: "js"
			}))
		}
		const request = createAsyncPrecompiler({
			precompilerOptions: {
				...opts,
				inline: true,
				// set by `bun test`
				checkHelpers: opts?.checkHelpers ?? process.env.NODE_ENV === "test"
			}
		})
		const { include, exclude } = transformedFilterOf(
			optedInPackagesOf(opts?.cwd ?? process.cwd())
		)
		// a runtime plugin's onLoad must return a module, so the filter excludes what isn't transformed
		const filter = new RegExp(`^(?!.*${exclude.source}).*${include.source}`)
		build.onLoad({ filter }, async ({ path }) => {
			const source = readFileSync(path, "utf8")
			const transformed = (await request("transform", source, path)) as
				| InlineModule
				| undefined
			for (const warning of transformed?.warnings ?? []) console.warn(warning)
			if (transformed?.errors.length) throwError(transformed.errors.join("\n"))
			return { contents: transformed?.code ?? source }
		})
	}
})
