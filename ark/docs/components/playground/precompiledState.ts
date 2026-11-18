/** bundled from precompile.worker.ts by lib/writePrecompileWorker.ts */
export const precompileWorkerUrl = "/live/precompile.worker.js"

/** a size build's checkers, then the same validator compiled if it can be */
export type PrecompileRequest = { id: number; written: string[] }

export type PrecompiledSize = {
	/** with the runtime it reads, tree-shaken */
	min: number
	gz: number
	/** the validator's own code, its runtime imported */
	ownMin: number
}

export type PrecompileResponse =
	| { id: number; chosen: number; size: PrecompiledSize }
	| { id: number; error: string }

/** the runtime as one module and what minifiedSizeOf counts of it */
export interface PrecompileRuntime {
	code: string
	localsByExport: Record<string, string>
	lengths: number[]
	reached: Record<string, number[]>
}
