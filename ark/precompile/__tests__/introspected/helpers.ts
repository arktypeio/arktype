import { type } from "arktype"

// a factory of one variant for each parameter count of the functions it receives
export function piped(fn: (...args: any[]) => unknown) {
	const T = type("string").pipe(fn)
	return T
}

export function pair(
	f: (...args: any[]) => boolean,
	g: (...args: any[]) => unknown
) {
	const T = type({ a: type("string").narrow(f), b: type("number").pipe(g) })
	return T
}
