import { throwError } from "@ark/util"
import { registerHooks } from "node:module"
import { fileURLToPath } from "node:url"
import {
	MessageChannel,
	receiveMessageOnPort,
	Worker,
	workerData
} from "node:worker_threads"
import type {
	InlineModule,
	PrecompileAnswer,
	PrecompilePluginOptions,
	PrecompileRequest,
	PrecompilerWorkerData
} from "./driver.ts"
import { isTransformed } from "./host.ts"

const isPrecompilerWorker = !!(workerData as PrecompilerWorkerData | null)?.port

export const register = (opts?: PrecompilePluginOptions): void => {
	// the worker inherits the flags that registered these hooks
	if (isPrecompilerWorker) return
	const { port1, port2 } = new MessageChannel()
	const answered = new Int32Array(new SharedArrayBuffer(4))
	let worker: Worker | undefined
	const request = (...request: PrecompileRequest): unknown => {
		if (!worker) {
			worker = new Worker(new URL(import.meta.url), {
				workerData: {
					precompilerOptions: opts ?? {},
					port: port2,
					answered
				} satisfies PrecompilerWorkerData,
				transferList: [port2]
			})
			worker.unref()
		}
		Atomics.store(answered, 0, 0)
		port1.postMessage(request)
		Atomics.wait(answered, 0, 0)
		const answer = receiveMessageOnPort(port1)!.message as PrecompileAnswer
		if ("error" in answer) throw answer.error
		return answer.result
	}
	const isStandalone = opts?.runtime !== "arktype"
	registerHooks({
		resolve: (specifier, context, nextResolve) => {
			if (specifier !== "arktype") return nextResolve(specifier, context)
			if (context.parentURL?.includes("/node_modules/")) {
				const { errors, warnings } = request(
					"readDependency",
					fileURLToPath(context.parentURL)
				) as { errors: string[]; warnings: string[] }
				for (const warning of warnings) process.emitWarning(warning)
				if (errors.length) throwError(errors.join("\n"))
			}
			return nextResolve(isStandalone ? "arktype/runtime" : specifier, context)
		},
		load: (url, context, nextLoad) => {
			const loaded = nextLoad(url, context)
			if (!url.startsWith("file:") || loaded.source === undefined) return loaded
			const id = fileURLToPath(url)
			if (!isTransformed(id)) return loaded
			const transformed = request(
				"transform",
				typeof loaded.source === "string" ?
					loaded.source
				:	new TextDecoder().decode(loaded.source),
				id
			) as InlineModule | undefined
			for (const warning of transformed?.warnings ?? [])
				process.emitWarning(warning)
			return transformed?.code ?
					{ ...loaded, source: transformed.code }
				:	loaded
		}
	})
}

// the worker the hooks request precompilation from runs this module
if (isPrecompilerWorker) {
	void import("./driver.ts").then(driver =>
		driver.answerRequests(workerData.port, workerData)
	)
}
