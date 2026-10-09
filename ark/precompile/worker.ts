import {
	MessageChannel,
	parentPort,
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
)?.precompilerOptions

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

// for a host that waits asynchronously, answered in the order it asks
export const createAsyncPrecompiler = (
	data: Omit<PrecompilerWorkerData, "port" | "answered">
): ((...request: PrecompileRequest) => Promise<unknown>) => {
	const pending: ((answer: PrecompileAnswer) => void)[] = []
	let worker: Worker | undefined
	return (...request) => {
		if (!worker) {
			// a worker that never started has nothing to close
			if (request[0] === "close") return Promise.resolve()
			const started = new Worker(new URL(import.meta.url), {
				workerData: data satisfies PrecompilerWorkerData
			})
			// it keeps the host's process alive only while a request is pending
			started.on("message", (answer: PrecompileAnswer) => {
				pending.shift()!(answer)
				if (!pending.length) started.unref()
			})
			// a worker that dies fails what it was asked, and the next request starts another
			started.on("error", error => {
				worker = undefined
				for (const settle of pending.splice(0)) settle({ error })
			})
			worker = started
		}
		worker.ref()
		worker.postMessage(request)
		return new Promise((resolve, reject) =>
			pending.push(answer =>
				"error" in answer ? reject(answer.error) : resolve(answer.result)
			)
		)
	}
}

// the worker requests are answered in runs this module
if (isPrecompilerWorker) {
	// awaited, since Bun drops a message that arrives once the module has evaluated without a listener
	const driver = await import("./driver.ts")
	const data = workerData as PrecompilerWorkerData
	driver.answerRequests(data.port ?? parentPort!, data)
}
