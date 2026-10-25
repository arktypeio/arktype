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

// e.g. ["./setup.ts"] for NODE_OPTIONS="--import ./setup.ts"
const nodeOptionPreloads = (): string[] =>
	[
		...(process.env.NODE_OPTIONS ?? "").matchAll(
			/(?:^|\s)(?:--import|--require|-r)(?:=|\s+)(\S+)/g
		)
	].map(match => match[1])

export const writeStoppedMessage = (
	stopped: string,
	fails: "throws" | "exits"
): string => {
	const preloads = nodeOptionPreloads()
	return `@ark/aot's precompiler ${stopped} before it answered, as it does where a module the process preloads ${fails} in a worker thread${preloads.length ? `, like ${preloads.join(" or ")}, which NODE_OPTIONS loads` : ""}. Pass it to node as a flag instead, as \`node --import ${preloads[0] ?? "./setup.ts"}\`, which keeps it out of the precompiler's thread, or return from it early where \`isMainThread\` from node:worker_threads is false. To see its error and stack, run \`node -e 'new (require("node:worker_threads").Worker)(new URL("data:text/javascript,"))'\` with the same NODE_OPTIONS.`
}

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
		if (!answer) throwError(writeStoppedMessage("stopped", "throws"))
		if ("error" in answer) throw answer.error
		return answer.result
	}
}

// what a bundler resolves a specifier to, as an alias only its config names
export type BundlerResolve = (
	specifier: string,
	importer: string
) => Promise<string | undefined>

interface PendingRequest {
	// its place among the requests its worker was sent
	index: number
	settle: (answer: PrecompileAnswer) => void
	resolve: BundlerResolve | undefined
}

// carries what the driver asks the bundler to resolve, which its thread waits
// for. A question names the request it's answered for, as the answer to the
// one before may not have arrived, and is numbered, as its thread drops an
// answer it stopped waiting for. Bun doesn't deliver it while the thread
// asking waits
const resolvingChannelOf = (
	pending: PendingRequest[]
): { resolver: MessagePort; resolved: Int32Array } | undefined => {
	if ("bun" in process.versions) return
	const { port1, port2 } = new MessageChannel()
	const resolved = new Int32Array(new SharedArrayBuffer(4))
	port1.on(
		"message",
		async ([question, index, specifier, importer]: [
			number,
			number,
			string,
			string
		]) => {
			const resolve = pending.find(entry => entry.index === index)?.resolve
			// null where the request can't ask, so the driver can ask again
			const path =
				resolve ?
					await resolve(specifier, importer).catch(() => undefined)
				:	null
			port1.postMessage([question, path])
			// counts the answers, so one arriving as the thread waits wakes it
			Atomics.add(resolved, 0, 1)
			Atomics.notify(resolved, 0)
		}
	)
	port1.unref()
	return { resolver: port2, resolved }
}

export const createAsyncPrecompiler = (
	data: Omit<
		PrecompilerWorkerData,
		"port" | "answered" | "lifeline" | "resolver" | "resolved"
	>
): ((
	request: PrecompileRequest,
	resolve?: BundlerResolve
) => Promise<unknown>) => {
	const pending: PendingRequest[] = []
	let worker: Worker | undefined
	let sent = 0
	return (request, resolve) => {
		if (!worker) {
			if (request[0] === "close") return Promise.resolve()
			sent = 0
			const channel = resolvingChannelOf(pending)
			const started = new Worker(driverUrl, {
				workerData: { ...data, ...channel } satisfies PrecompilerWorkerData,
				transferList: channel ? [channel.resolver] : [],
				execArgv: driverExecArgv
			})
			// it keeps the host's process alive only while a request is pending
			started.on("message", (answer: PrecompileAnswer) => {
				pending.shift()!.settle(answer)
				if (!pending.length) started.unref()
			})
			// a stopped worker fails what it was asked, and the next request restarts it
			let error: unknown
			started.on("error", e => (error = e))
			started.on("exit", code => {
				if (worker === started) worker = undefined
				error ??= new Error(
					writeStoppedMessage(`exited with code ${code}`, "exits")
				)
				for (const { settle } of pending.splice(0)) settle({ error })
			})
			worker = started
		}
		worker.ref()
		worker.postMessage(request)
		return new Promise((settled, failed) =>
			pending.push({
				index: sent++,
				settle: answer =>
					"error" in answer ? failed(answer.error) : settled(answer.result),
				resolve
			})
		)
	}
}
