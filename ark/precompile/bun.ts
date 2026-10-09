import { throwError } from "@ark/util"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parentPort, Worker, workerData } from "node:worker_threads"
import type {
	InlineModule,
	PrecompileAnswer,
	PrecompilePluginOptions,
	PrecompileRequest,
	PrecompilerWorkerData
} from "./driver.ts"
import {
	createNodeHost,
	optedInPackagesOf,
	transformedFilterOf
} from "./host.ts"

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
		const pending: ((answer: PrecompileAnswer) => void)[] = []
		let worker: Worker | undefined
		const request = (...request: PrecompileRequest): Promise<unknown> => {
			if (!worker) {
				worker = new Worker(new URL(import.meta.url), {
					workerData: {
						precompilerOptions: opts ?? {}
					} satisfies PrecompilerWorkerData
				})
				worker.on("message", (answer: PrecompileAnswer) =>
					pending.shift()!(answer)
				)
				worker.unref()
			}
			worker.postMessage(request)
			return new Promise((resolve, reject) =>
				pending.push(answer =>
					"error" in answer ? reject(answer.error) : resolve(answer.result)
				)
			)
		}
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

// the worker the plugin requests precompilation from runs this module
if ((workerData as PrecompilerWorkerData | null)?.precompilerOptions) {
	// awaited, since Bun drops a message that arrives once the module has evaluated without a listener
	const driver = await import("./driver.ts")
	driver.answerRequests(parentPort!, workerData)
}
