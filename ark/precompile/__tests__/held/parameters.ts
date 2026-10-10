import { type } from "arktype"

// arktype passes a predicate or morph its context unless it has 1 parameter, so each count is a variant its factory selects
function narrowed(fn: (...args: any[]) => boolean) {
	const T = type("string").narrow(fn)
	return T
}

function piped(fn: (...args: any[]) => unknown) {
	const T = type({ a: "string" }).pipe(fn)
	return T
}

export const Long = narrowed((s: string) => s.length > 2)
export const Any = narrowed(() => true)
export const Rejecting = narrowed(
	(s: string, ctx: any) => s.length > 2 || ctx.reject("long")
)
export const Length = piped((o: { a: string }) => o.a.length)
export const Constant = piped(() => 7)
export const Erroring = piped(
	(o: { a: string }, ctx: any) => o.a.length || ctx.error("an a")
)
