/** what the live type() line shows for one definition and argument */
export type LiveState =
	| {
			def: string
			ok: true
			description: string
			expression: string
			/** the call's result, as a comment */
			out: string
			outOk: boolean
	  }
	| { def: string; ok: false; message: string; out: string }

/** bundled from ark.worker.ts by lib/writeLiveWorker.ts */
export const liveWorkerUrl = "/live/ark.worker.js"

export type LiveRequest = { id: number; def: string; arg: string }

export type LiveResponse = { ready: true } | { id: number; state: LiveState }
