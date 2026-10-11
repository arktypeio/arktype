import { type } from "arktype"

const piped = (fn: (s: string) => unknown) => type("string").pipe(fn)

const count = function (s: string) {
	return arguments.length
}

// arktype reads a function's length once, where the first definition holding it does
export const Counted = type("string").pipe(count)
Object.defineProperty(count, "length", { value: 2 })
export const Recounted = piped(count)
