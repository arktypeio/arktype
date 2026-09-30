import { fromHere } from "@ark/fs"
import { build, type BuildOptions } from "esbuild"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { runNode } from "./roots.ts"

/** metric name -> one value, or the samples taken within one process */
export type ProcessResult = Record<string, number | number[]>

export type Suite = {
	/** independent processes per root, by default */
	processes: { run: number; compare: number }
	/** measured once, unrecorded, before the real runs (to warm the page cache) */
	warmup?: true
	/** gives identical results every run, so one run per root suffices */
	deterministic?: true
	measure: (root: string) => ProcessResult | Promise<ProcessResult>
}

const inChild = (
	file: string,
	options: object,
	nodeArgs: string[] = []
): ProcessResult => {
	const stdout = runNode([
		...nodeArgs,
		fromHere(file),
		JSON.stringify(options)
	]).trim()
	return JSON.parse(stdout.slice(stdout.lastIndexOf("\n") + 1))
}

const createWorkloads = ["object", "object jitless", "composite", "scope"]

const bundleSizes = async (root: string): Promise<ProcessResult> => {
	const entry = (pkg: string) => join(root, "ark", pkg, "out", "index.js")
	const entries: Record<string, BuildOptions> = {
		arktype: { entryPoints: [entry("type")] },
		"@ark/schema": { entryPoints: [entry("schema")] },
		arksets: { entryPoints: [entry("sets")] },
		"minimal app": {
			stdin: {
				contents: `import { type } from ${JSON.stringify(entry("type"))}\nexport const valid = type({ a: "string" }).allows({ a: "" })\n`,
				resolveDir: root
			}
		}
	}
	const sizes: ProcessResult = {}
	for (const [name, options] of Object.entries(entries)) {
		// as testBundle.ts, but from the root's out/ rather than the repo's sources
		const result = await build({
			...options,
			bundle: true,
			minify: true,
			platform: "neutral",
			write: false,
			logLevel: "error"
		})
		const js = result.outputFiles![0].contents
		sizes[`${name} min (bytes)`] = js.byteLength
		sizes[`${name} gzip (bytes)`] = gzipSync(js).byteLength
	}
	return sizes
}

export const suites = {
	init: {
		processes: { run: 15, compare: 15 },
		warmup: true,
		measure: root => inChild("init.ts", { root })
	},
	create: {
		processes: { run: 1, compare: 5 },
		// a process per workload, so each starts from a fresh registry
		measure: root =>
			Object.assign(
				{},
				...createWorkloads.map(workload =>
					inChild("create.ts", { root, workload }, ["--expose-gc"])
				)
			)
	},
	validate: {
		processes: { run: 1, compare: 5 },
		measure: root => inChild("validate.ts", { root }, ["--expose-gc"])
	},
	memory: {
		processes: { run: 1, compare: 3 },
		measure: root => inChild("memory.ts", { root }, ["--expose-gc"])
	},
	bundle: {
		processes: { run: 1, compare: 1 },
		deterministic: true,
		measure: bundleSizes
	}
} satisfies Record<string, Suite>

export type SuiteName = keyof typeof suites

export const suiteNames = Object.keys(suites) as SuiteName[]
