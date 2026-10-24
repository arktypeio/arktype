import { throwError } from "@ark/util"
import { extname } from "node:path"
import {
	MessageChannel,
	receiveMessageOnPort,
	Worker,
	workerData,
	type MessagePort
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

// the precompiler loads only its own modules and arktype's, so its thread
// takes only the flags that resolve and read them. Others would run a module
// the program preloads, like its config module, before the build configures
// arktype there, or fail the worker, as --input-type does
const driverFlag =
	/^(?:--conditions|-C|--preserve-symlinks|--experimental-strip-types|--no-experimental-strip-types|--experimental-transform-types)(?:=|$)/
const driverFlagWithValue = /^(?:--conditions|-C)$/

const driverExecArgv = process.execArgv.filter(
	(arg, i, args) =>
		driverFlag.test(arg) || driverFlagWithValue.test(args[i - 1] ?? "")
)

const waiting = 0
const answered = 1
const stopped = 2

// a host blocked on an answer can't hear the driver's thread stop, so a
// thread started without the host's flags hears it and wakes the host
const watcher = `
const { lifeline, state } = require("node:worker_threads").workerData
lifeline.on("message", () => {})
lifeline.on("close", () => {
	Atomics.store(state, 0, ${stopped})
	Atomics.notify(state, 0)
})
`

interface SyncWorker {
	port: MessagePort
	state: Int32Array
}

// isolates arktype's modules and globals from the program's
export const createSyncPrecompiler = (
	data: Omit<PrecompilerWorkerData, "port" | "answered" | "lifeline">
): ((...request: PrecompileRequest) => unknown) => {
	let worker: SyncWorker | undefined
	const start = (): SyncWorker => {
		const { port1, port2 } = new MessageChannel()
		const lifeline = new MessageChannel()
		const state = new Int32Array(new SharedArrayBuffer(4))
		new Worker(driverUrl, {
			workerData: {
				...data,
				port: port2,
				answered: state,
				lifeline: lifeline.port2
			} satisfies PrecompilerWorkerData,
			transferList: [port2, lifeline.port2],
			execArgv: driverExecArgv
		})
			// its error arrives only once the host is unblocked, after the stop was thrown
			.on("error", error => process.emitWarning(error))
			.unref()
		new Worker(watcher, {
			eval: true,
			execArgv: [],
			workerData: { lifeline: lifeline.port1, state },
			transferList: [lifeline.port1]
		}).unref()
		return { port: port1, state }
	}
	return (...request) => {
		// a driver that stopped between requests is started again
		if (
			!worker ||
			Atomics.compareExchange(worker.state, 0, answered, waiting) === stopped
		) {
			if (request[0] === "close") {
				worker = undefined
				return
			}
			worker = start()
		}
		const { port, state } = worker
		port.postMessage(request)
		Atomics.wait(state, 0, waiting)
		const answer = receiveMessageOnPort(port)?.message as
			| PrecompileAnswer
			| undefined
		if (!answer || request[0] === "close") worker = undefined
		if (!answer) {
			throwError(
				"@ark/aot's precompiler stopped before it answered, as it does where a module the process preloads throws in a worker"
			)
		}
		if ("error" in answer) throw answer.error
		return answer.result
	}
}

export const createAsyncPrecompiler = (
	data: Omit<PrecompilerWorkerData, "port" | "answered" | "lifeline">
): ((...request: PrecompileRequest) => Promise<unknown>) => {
	const pending: ((answer: PrecompileAnswer) => void)[] = []
	let worker: Worker | undefined
	return (...request) => {
		if (!worker) {
			if (request[0] === "close") return Promise.resolve()
			const started = new Worker(driverUrl, {
				workerData: data satisfies PrecompilerWorkerData,
				execArgv: driverExecArgv
			})
			// it keeps the host's process alive only while a request is pending
			started.on("message", (answer: PrecompileAnswer) => {
				pending.shift()!(answer)
				if (!pending.length) started.unref()
			})
			// a stopped worker fails what it was asked, and the next request restarts it
			let error: unknown
			started.on("error", e => (error = e))
			started.on("exit", code => {
				if (worker === started) worker = undefined
				error ??= new Error(
					`@ark/aot's precompiler exited with code ${code} before it answered`
				)
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
