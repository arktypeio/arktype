import { throwError } from "@ark/util"
import { resolve } from "node:path"
import type { MessagePort } from "node:worker_threads"
import { createNodeHost, isTransformed, type NodeHostOptions } from "./host.ts"
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

// thrown together, so a host that shows one error for a module shows each
export const reportDiagnostics = (
	diagnostics: Diagnostic[],
	warn: (message: string) => void
): void => {
	const errors: string[] = []
	for (const diagnostic of diagnostics) {
		if (diagnostic.severity === "error")
			errors.push(renderDiagnostic(diagnostic))
		else warn(renderDiagnostic(diagnostic))
	}
	if (errors.length) throwError(errors.join("\n"))
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
	warnings: string[]
}

export type PrecompileAnswer = { result: unknown } | { error: unknown }

// a precompiler in the program's thread would share arktype's modules and globals with it
export const answerRequests = (
	port: MessagePort,
	data: PrecompilerWorkerData
): void => {
	let precompiler: Precompiler | undefined
	port.on("message", (request: PrecompileRequest) => {
		try {
			precompiler ??= createPrecompiler({
				...data.precompilerOptions,
				inline: true
			})
			port.postMessage({
				result:
					request[0] === "transform" ?
						inlineModuleOf(precompiler, request[1], request[2])
					:	precompiler.readDependency(request[1])
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

const inlineModuleOf = (
	precompiler: Precompiler,
	source: string,
	id: string
): InlineModule | undefined => {
	if (!isTransformed(id) || !precompiler.importsArk(source, id)) return
	const result = precompiler.precompile(source, id)
	const warnings: string[] = []
	reportDiagnostics(result.diagnostics, message => warnings.push(message))
	return {
		code:
			result.map &&
			`${result.code}\n//# sourceMappingURL=${result.map.toUrl()}`,
		warnings
	}
}
