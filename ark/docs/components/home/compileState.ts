/** bundled from compile.worker.ts by lib/writeLiveWorker.ts */
export const compileWorkerUrl = "/live/compile.worker.js"

/** what the precompiler made of one declaration typed into the page */
export type CompileResult =
	| {
			ok: true
			/** the checks it wrote, as emitted: the Type's own, then those it calls */
			code: string
			/** how many checks that is */
			checks: number
	  }
	| { ok: false; message: string }

export type CompileRequest = { id: number; source: string }

export type CompileResponse =
	| { ready: true }
	| { id: number; result: CompileResult }
