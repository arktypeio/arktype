import { throwInternalError } from "./errors.ts"
import { unset } from "./records.ts"

export type Fn<
	args extends readonly any[] = readonly any[],
	returns = unknown
> = (...args: args) => returns

export const cached = <t>(thunk: () => t): (() => t) => {
	let result: t | unset = unset
	return () => (result === unset ? (result = thunk()) : result)
}

export const isThunk = <value>(
	value: value
): value is Extract<value, Thunk> extends never ? value & Thunk
:	Extract<value, Thunk> => typeof value === "function" && value.length === 0

export type Thunk<ret = unknown> = () => ret

export type thunkable<t> = t | Thunk<t>

export const tryCatch = <returns, onError = never>(
	fn: () => returns,
	onError?: (e: unknown) => onError
): returns | onError => {
	try {
		return fn()
	} catch (e) {
		return onError?.(e) as onError
	}
}

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

export type DynamicFunction = new <fn extends Fn>(
	...args: ConstructorParameters<typeof Function>
) => fn & {
	apply(thisArg: null, args: Parameters<fn>): ReturnType<fn>

	call(thisArg: null, ...args: Parameters<fn>): ReturnType<fn>
}

export type CallableOptions<attachments extends object> = {
	attach?: attachments
	bind?: object
}

/** @ts-ignore required to cast function type */
export interface Callable<fn extends Fn, attachments extends object>
	extends fn,
		attachments {}

export class Callable<fn extends Fn, attachments extends object = {}> {
	constructor(
		fn: fn,
		...[opts]: {} extends attachments ? [opts?: CallableOptions<attachments>]
		:	[opts: CallableOptions<attachments>]
	) {
		return Object.assign(
			Object.setPrototypeOf(
				fn.bind(opts?.bind ?? this),
				this.constructor.prototype
			),
			opts?.attach
		)
	}
}

export type GuardablePredicate<
	input = unknown,
	narrowed extends input = input
> = ((In: input) => In is narrowed) | ((In: input) => boolean)

export type TypeGuard<input = unknown, narrowed extends input = input> = (
	In: input
) => In is narrowed

/**
 * Checks if the environment has Content Security Policy (CSP) enabled,
 * preventing JIT-optimized code from being compiled via new Function().
 *
 * @returns `true` if a function created using new Function() can be
 * successfully invoked in the environment, `false` otherwise.
 *
 * The result is cached for subsequent invocations.
 */
export const envHasCsp = cached((): boolean => {
	try {
		return new Function("return false")()
	} catch {
		return true
	}
})
