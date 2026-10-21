/**
 * The live type() line's parser, off the main thread: evaluating the arktype
 * module is the page's single most expensive script, so nothing else imports
 * it. liveEngine.ts starts this only on intent.
 */
import { evaluate } from "./evaluate.ts"
import type { LiveRequest, LiveResponse } from "./liveState.ts"

const scope = self as unknown as {
	onmessage: (e: MessageEvent<LiveRequest>) => void
	postMessage: (response: LiveResponse) => void
}

scope.onmessage = ({ data }) =>
	scope.postMessage({ id: data.id, state: evaluate(data.def, data.arg) })

scope.postMessage({ ready: true })
