import { throwInternalError } from "./errors.js"

export type Fn<
	args extends readonly unknown[] = readonly never[],
	returns = unknown
> = (...args: args) => returns

export type paramsOf<t> = t extends Fn<infer p> ? p : never

export type returnOf<t> = t extends Fn<never, infer r> ? r : never

export const cached = <T>(thunk: () => T) => {
	let isCached = false
	let result: T | undefined
	return () => {
		if (!isCached) {
			result = thunk()
			isCached = true
		}
		return result as T
	}
}

export const isThunk = <value>(
	value: value
): value is Extract<value, Thunk> extends never
	? value & Thunk
	: Extract<value, Thunk> => typeof value === "function" && value.length === 0

export type Thunk<ret = unknown> = () => ret

export type thunkable<t> = t | Thunk<t>

export const CompiledFunction = class extends Function {
	constructor(...args: [string, ...string[]]) {
		const params = args.slice(0, -1)
		const body = args.at(-1)!
		try {
			super(...params, body)
		} catch (e) {
			return throwInternalError(
				`Encountered an unexpected error while compiling your definition:
                Message: ${e} 
                Source: (${args.slice(0, -1)}) => {
                    ${args.at(-1)}
                }`
			)
		}
	}
} as CompiledFunction

export type CompiledFunction = new <f extends (...args: never[]) => unknown>(
	...args: ConstructorParameters<typeof Function>
) => f & {
	apply(thisArg: null, args: Parameters<f>): ReturnType<f>

	call(thisArg: null, ...args: Parameters<f>): ReturnType<f>
}
