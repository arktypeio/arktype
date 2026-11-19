/**
 * The precompile page's figure, live: emit.ts, which the build ran on
 * the figure's own Shape, run on the declaration the reader edits. Nothing
 * loads it until they do.
 */
import type { CompileRequest, CompileResponse } from "./compileState.ts"
import { emit } from "./emit.ts"

type WorkerScope = {
	onmessage: (e: MessageEvent<CompileRequest>) => void
	postMessage: (response: CompileResponse) => void
}

const scope = (): WorkerScope => self as never

scope().onmessage = ({ data }) =>
	scope().postMessage({ id: data.id, result: emit(data.source) })

scope().postMessage({ ready: true })
