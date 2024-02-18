import { throwInternalError } from "./errors.js"
import { CastableBase } from "./records.js"

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

export const DynamicFunction = class extends Function {
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
} as DynamicFunction

export type DynamicFunction = new <f extends (...args: never[]) => unknown>(
	...args: ConstructorParameters<typeof Function>
) => f & {
	apply(thisArg: null, args: Parameters<f>): ReturnType<f>

	call(thisArg: null, ...args: Parameters<f>): ReturnType<f>
}

export const Callable: Callable = class {
	constructor(f: Function, thisArg?: object) {
		return Object.setPrototypeOf(
			f.bind(thisArg ?? this),
			this.constructor.prototype
		)
	}
} as never

export type Callable = new <f extends (...args: never[]) => unknown>(
	f: f,
	thisArg?: object
) => f

export type Guardable<input = unknown, narrowed extends input = input> =
	| ((In: input) => In is narrowed)
	| ((In: input) => boolean)
