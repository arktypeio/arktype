import {
	MessageChannel,
	receiveMessageOnPort,
	Worker,
	workerData
} from "node:worker_threads"
import type {
	PrecompileAnswer,
	PrecompileRequest,
	PrecompilerWorkerData
} from "./driver.ts"

export const isPrecompilerWorker = !!(
	workerData as PrecompilerWorkerData | null
)?.port

// a precompiler in the program's thread would share arktype's modules and globals with it
export const createSyncPrecompiler = (
	data: Omit<PrecompilerWorkerData, "port" | "answered">
): ((...request: PrecompileRequest) => unknown) => {
	const { port1, port2 } = new MessageChannel()
	const answered = new Int32Array(new SharedArrayBuffer(4))
	let worker: Worker | undefined
	return (...request) => {
		if (!worker) {
			worker = new Worker(new URL(import.meta.url), {
				workerData: {
					...data,
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
}

// the worker requests are answered in runs this module
if (isPrecompilerWorker) {
	void import("./driver.ts").then(driver =>
		driver.answerRequests(workerData.port, workerData)
	)
}
