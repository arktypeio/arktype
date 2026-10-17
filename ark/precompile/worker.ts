import { extname } from "node:path"
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
)?.precompilerOptions

// a worker runs the driver, since a module a CommonJS config requires can't await it
const driverUrl = new URL(
	`./driver${extname(import.meta.url)}`,
	import.meta.url
)

// isolates arktype's modules and globals from the program's
export const createSyncPrecompiler = (
	data: Omit<PrecompilerWorkerData, "port" | "answered">
): ((...request: PrecompileRequest) => unknown) => {
	const { port1, port2 } = new MessageChannel()
	const answered = new Int32Array(new SharedArrayBuffer(4))
	let worker: Worker | undefined
	return (...request) => {
		if (!worker) {
			if (request[0] === "close") return
			worker = new Worker(driverUrl, {
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

export const createAsyncPrecompiler = (
	data: Omit<PrecompilerWorkerData, "port" | "answered">
): ((...request: PrecompileRequest) => Promise<unknown>) => {
	const pending: ((answer: PrecompileAnswer) => void)[] = []
	let worker: Worker | undefined
	return (...request) => {
		if (!worker) {
			if (request[0] === "close") return Promise.resolve()
			const started = new Worker(driverUrl, {
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
