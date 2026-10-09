import { throwError } from "@ark/util"
import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import type { MessagePort } from "node:worker_threads"
import { createNodeHost, type NodeHostOptions } from "./host.ts"
import {
	Precompiler,
	renderDiagnostic,
	standaloneConfigurationMessage,
	type Diagnostic,
	type PrecompileOptions
} from "./precompile.ts"

export interface PrecompilePluginOptions
	extends PrecompileOptions,
		NodeHostOptions {}

export const createPrecompiler = (
	opts?: PrecompilePluginOptions
): Precompiler => {
	if (opts?.runtime !== "arktype" && opts?.config)
		throwError(standaloneConfigurationMessage)
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
	| [kind: "readDependency", importer: string]

export interface InlineModule {
	// undefined when the module is unchanged
	code: string | undefined
	errors: string[]
	warnings: string[]
}

export type PrecompileAnswer = { result: unknown } | { error: unknown }

export const answerRequests = (
	port: MessagePort,
	data: PrecompilerWorkerData
): void => {
	const create = () =>
		createPrecompiler({ ...data.precompilerOptions, inline: true })
	let precompiler: Precompiler | undefined
	port.on("message", (request: PrecompileRequest) => {
		try {
			port.postMessage({
				result:
					request[0] === "readDependency" ?
						(precompiler ??= create()).readDependency(request[1])
					:	inlineModuleOf((precompiler ??= create()), request[1], request[2])
			} satisfies PrecompileAnswer)
		} catch (e) {
			port.postMessage({ error: e } satisfies PrecompileAnswer)
		}
		if (data.answered) {
			Atomics.store(data.answered, 0, 1)
			Atomics.notify(data.answered, 0)
		}
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
		const files = [id]
		let isStale = false
		for (let i = 0; i < files.length; i++) {
			const file = files[i]
			const { mtimeMs } = statSync(file)
			isStale ||= file in readTimes && readTimes[file] !== mtimeMs
			const cached = importsByFile[file]
			const imports =
				i === 0 ? precompiler.localImportsOf(source, id)
				: cached?.[0] === mtimeMs ? cached[1]
				: (importsByFile[file] = [
						mtimeMs,
						precompiler.localImportsOf(readFileSync(file, "utf8"), file)
					])[1]
			for (const target of imports)
				if (!files.includes(target)) files.push(target)
		}
		if (isStale) precompiler = create()
		const inlined = inlineModuleOf(precompiler, source, id)
		return {
			code: inlined?.code,
			errors: inlined?.errors ?? [],
			warnings: inlined?.warnings ?? [],
			files
		}
	}
}

const inlineModuleOf = (
	precompiler: Precompiler,
	source: string,
	id: string
): InlineModule | undefined => {
	if (
		!precompiler.isTransformed(id) ||
		!(precompiler.checkHelpers || precompiler.importsArk(source, id))
	)
		return
	const result = precompiler.precompile(source, id)
	return {
		code:
			result.map &&
			`${result.code}\n//# sourceMappingURL=${result.map.toUrl()}`,
		...renderDiagnostics(result.diagnostics)
	}
}
