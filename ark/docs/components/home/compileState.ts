/** bundled from compile.worker.ts by lib/writeLiveWorker.ts */
export const compileWorkerUrl = "/live/compile.worker.js"

/** the checks the precompiler wrote for one declaration, as emit.ts lays them out */
export type Emitted = {
	ok: true
	/** the Type's own check */
	main: string
	/** each check that one calls, in the order it calls them */
	helpers: string[]
}

/** what the precompiler made of one declaration: its checks, or why the build stops */
export type CompileResult = Emitted | { ok: false; message: string }

export type CompileRequest = { id: number; source: string }

export type CompileResponse =
	| { ready: true }
	| { id: number; result: CompileResult }
