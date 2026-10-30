import {
	liveWorkerUrl,
	type LiveRequest,
	type LiveResponse,
	type LiveState
} from "./liveState.ts"

export type LiveEngine = {
	/** the answer arrives through onState, and only for the latest call */
	run: (def: string, arg: string) => void
}

export type LiveEngineHandlers = {
	onReady: () => void
	onState: (state: LiveState) => void
}

/** a call the worker hasn't answered by then (a backtracking regex) is stopped */
const timeoutMs = 1000

const timedOut = (def: string): LiveState => ({
	def,
	ok: false,
	message: `stopped after ${timeoutMs / 1000}s without an answer`,
	out: "// no result"
})

/**
 * Starts the parser in a module worker. If the worker can't start, the same
 * evaluate() is imported onto the main thread instead, so callers see
 * identical results either way. A worker that hangs on a call is replaced.
 */
export const startLiveEngine = ({
	onReady,
	onState
}: LiveEngineHandlers): LiveEngine => {
	let latest: LiveRequest | undefined
	let worker: Worker | undefined
	let local: Promise<typeof import("./evaluate.ts")> | undefined
	/** ids posted to the worker and not yet answered, in the order it runs them */
	let queued: number[] = []
	let ready = false
	let watchdog: ReturnType<typeof setTimeout> | undefined

	const loadLocal = () =>
		(local ??= import("./evaluate.ts").then(
			module => {
				onReady()
				return module
			},
			(error: unknown) => {
				// a later call retries; until then the last state stays
				local = undefined
				throw error
			}
		))

	const runLocally = (request: LiveRequest) =>
		loadLocal().then(
			({ evaluate }) => {
				if (request === latest) onState(evaluate(request.def, request.arg))
			},
			() => {}
		)

	const fallBack = () => {
		clearTimeout(watchdog)
		worker?.terminate()
		worker = undefined
		if (latest) void runLocally(latest)
		else loadLocal().catch(() => {})
	}

	/** times whichever call the worker is running now */
	const watch = () => {
		clearTimeout(watchdog)
		if (ready && queued.length) watchdog = setTimeout(restart, timeoutMs)
	}

	const post = (request: LiveRequest) => {
		queued.push(request.id)
		worker!.postMessage(request)
		if (queued.length === 1) watch()
	}

	const restart = () => {
		const hung = queued[0]
		worker?.terminate()
		start()
		if (!latest) return
		if (hung === latest.id) onState(timedOut(latest.def))
		else if (worker) post(latest)
	}

	const start = () => {
		queued = []
		ready = false
		try {
			worker = new Worker(liveWorkerUrl, { type: "module" })
		} catch {
			fallBack()
			return
		}
		worker.onmessage = ({ data }: MessageEvent<LiveResponse>) => {
			if ("ready" in data) {
				ready = true
				onReady()
			} else {
				queued.shift()
				if (data.id === latest?.id) onState(data.state)
			}
			watch()
		}
		worker.onerror = e => {
			e.preventDefault()
			fallBack()
		}
	}

	start()

	let seq = 0
	return {
		run: (def, arg) => {
			latest = { id: ++seq, def, arg }
			if (worker) post(latest)
			else void runLocally(latest)
		}
	}
}
