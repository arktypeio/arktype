import type { Emitted } from "./compileState.ts"
import { emit } from "./emit.ts"

/** the definition the precompile page's figure opens on */
export const shapeSource = `const Shape = type({
	kind: "'circle'",
	radius: "number > 0"
}).or({
	kind: "'square'",
	side: "number > 0"
})`

const emitted = emit(shapeSource)
if (!emitted.ok) {
	throw new Error(
		`The precompile page's Shape doesn't precompile: ${emitted.message}`
	)
}

/**
 * What ships for it: the precompiler's own output, written when the site is
 * built. Nothing here is typed by hand, so the page can't show a check the
 * tool doesn't write, and the live editor (the same emit, in a worker) shows
 * this same code for this same text.
 */
export const shapeEmitted: Emitted = emitted
