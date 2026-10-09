import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import type { SourceMap } from "magic-string"
import { parentPort, workerData, type MessagePort } from "node:worker_threads"
import { createNodeHost, type NodeHostOptions } from "./host.ts"
import {
	Precompiler,
	renderDiagnostic,
	type Diagnostic,
	type PrecompileOptions,
	type Site
} from "./precompile.ts"
import { isPrecompilerWorker } from "./worker.ts"

export interface PrecompilePluginOptions
	extends PrecompileOptions,
		NodeHostOptions {}

export const createPrecompiler = (
	opts?: PrecompilePluginOptions
): Precompiler => {
	const cwd = opts?.cwd ?? process.cwd()
	return new Precompiler(createNodeHost(opts), {
		...opts,
		cwd,
		config: opts?.config && resolve(cwd, opts.config)
	})
}

// a host that shows one error for a module throws a module's errors together
export const renderDiagnostics = (
	diagnostics: Diagnostic[]
): { errors: string[]; warnings: string[] } => {
	const errors: string[] = []
	const warnings: string[] = []
	for (const diagnostic of diagnostics) {
		;(diagnostic.severity === "error" ? errors : warnings).push(
			renderDiagnostic(diagnostic)
		)
	}
	return { errors, warnings }
}

export interface PrecompilerWorkerData {
	precompilerOptions: PrecompilePluginOptions
	// a port to answer on and a flag notified after each answer, for a host that waits synchronously
	port?: MessagePort | undefined
	answered?: Int32Array | undefined
}

export type PrecompileRequest =
	| [kind: "transform", source: string, id: string]
	| [kind: "analyze", source: string, id: string]
	| [kind: "readDependency", importer: string]
	| [kind: "reset"]
	| [kind: "close"]

export interface InlineModule {
	// undefined when the module is unchanged
	code: string | undefined
	errors: string[]
	warnings: string[]
}

export interface TransformedModule extends InlineModule {
	map: SourceMap | undefined
	dependencies: string[]
	modules: Record<string, string>
}

export type PrecompileAnswer = { result: unknown } | { error: unknown }

// the part of a module's analysis a worker can send back
export interface AnalyzedModule {
	sites: Pick<Site, "start" | "line" | "column" | "status">[]
	diagnostics: Diagnostic[]
}

export const answerRequests = (
	port: MessagePort,
	data: PrecompilerWorkerData
): void => {
	let precompiler: Precompiler | undefined
	const answer = (request: PrecompileRequest): unknown => {
		if (request[0] === "reset") {
			precompiler = createPrecompiler(data.precompilerOptions)
			return precompiler.needsNewThread
		}
		if (request[0] === "close") return
		precompiler ??= createPrecompiler(data.precompilerOptions)
		if (request[0] === "readDependency")
			return precompiler.readDependency(request[1])
		if (request[0] === "transform")
			return transformedModuleOf(precompiler, request[1], request[2])
		const { sites, diagnostics } = precompiler.analyzeConfigured(
			request[1],
			request[2]
		)
		return {
			sites: sites.map(({ start, line, column, status }) => ({
				start,
				line,
				column,
				status
			})),
			diagnostics
		} satisfies AnalyzedModule
	}
	port.on("message", (request: PrecompileRequest) => {
		try {
			port.postMessage({ result: answer(request) } satisfies PrecompileAnswer)
		} catch (e) {
			port.postMessage({ error: e } satisfies PrecompileAnswer)
		}
		if (data.answered) {
			Atomics.store(data.answered, 0, 1)
			Atomics.notify(data.answered, 0)
		}
		if (request[0] === "close") port.close()
	})
}

export interface KeyedModule extends InlineModule {
	// the module's local import closure, the files its precompilation may read
	files: string[]
}

// for a host that keeps a precompiler across changes to the files it read, which it replaces once one changes
export const createKeyedPrecompiler = (
	opts: PrecompilePluginOptions
): ((source: string, id: string) => KeyedModule) => {
	let readTimes: Record<string, number> = {}
	const importsByFile: Record<string, [mtimeMs: number, imports: string[]]> = {}
	const create = () => {
		const result = createPrecompiler({ ...opts, inline: true })
		const { host } = result.graph
		readTimes = {}
		result.graph.host = {
			resolve: host.resolve,
			readFile: file => {
				const contents = host.readFile(file)
				if (contents !== undefined) readTimes[file] = statSync(file).mtimeMs
				return contents
			}
		}
		return result
	}
	let precompiler = create()
	return (source, id) => {
		const mtimes: Record<string, number> = {}
		const mtimeOf = (file: string) => (mtimes[file] ??= statSync(file).mtimeMs)
		const files = precompiler.localClosureOf(id, file => {
			if (file === id) return precompiler.localImportsOf(source, id)
			const cached = importsByFile[file]
			return cached?.[0] === mtimeOf(file) ?
					cached[1]
				:	(importsByFile[file] = [
						mtimeOf(file),
						precompiler.localImportsOf(readFileSync(file, "utf8"), file)
					])[1]
		})
		if (
			files.some(file => file in readTimes && readTimes[file] !== mtimeOf(file))
		)
			precompiler = create()
		const transformed = transformedModuleOf(precompiler, source, id)
		for (const dependency of transformed?.dependencies ?? [])
			if (!files.includes(dependency)) files.push(dependency)
		return {
			code: transformed?.code,
			errors: transformed?.errors ?? [],
			warnings: transformed?.warnings ?? [],
			files
		}
	}
}

const transformedModuleOf = (
	precompiler: Precompiler,
	source: string,
	id: string
): TransformedModule | undefined => {
	if (!precompiler.isTransformed(id)) return
	if (!precompiler.checkHelpers && !precompiler.importsArk(source, id)) {
		return {
			code: undefined,
			map: undefined,
			// a module it imports may come to export a Type, which only the bundler plugin watches for here
			dependencies:
				precompiler.inline ? [] : precompiler.localImportsOf(source, id),
			modules: {},
			errors: [],
			warnings: []
		}
	}
	const result = precompiler.precompile(source, id)
	return {
		code:
			result.map &&
			(precompiler.inline ?
				`${result.code}\n//# sourceMappingURL=${result.map.toUrl()}`
			:	result.code),
		map: precompiler.inline ? undefined : result.map,
		dependencies: result.dependencies,
		modules: result.modules,
		...renderDiagnostics(result.diagnostics)
	}
}

if (isPrecompilerWorker) {
	const data = workerData as PrecompilerWorkerData
	answerRequests(data.port ?? parentPort!, data)
}
