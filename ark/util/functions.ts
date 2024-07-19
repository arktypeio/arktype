import { throwInternalError } from "./errors.js"
import { NoopBase, unset } from "./records.js"

export const bound = (
	target: Function,
	ctx: ClassMemberDecoratorContext
): void => {
	ctx.addInitializer(function (this: any) {
		this[ctx.name] = this[ctx.name].bind(this)
	})
}

export const cached = <self>(
	target: (this: self) => any,
	context:
		| ClassGetterDecoratorContext<self, any>
		| ClassMethodDecoratorContext<self, (this: self) => any>
) =>
	function (this: self): any {
		const value = target.call(this)
		Object.defineProperty(
			this,
			context.name,
			context.kind === "getter" ?
				{ value }
			:	{
					value: () => value,
					enumerable: false
				}
		)
		return value
	}

export const cachedThunk = <t>(thunk: () => t): (() => t) => {
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

export type DynamicFunction = new <f extends (...args: never[]) => unknown>(
	...args: ConstructorParameters<typeof Function>
) => f & {
	apply(thisArg: null, args: Parameters<f>): ReturnType<f>

	call(thisArg: null, ...args: Parameters<f>): ReturnType<f>
}

export type CallableOptions<attachments extends object> = {
	attach?: attachments
	bind?: object
}

/** @ts-expect-error required to cast function type */
export class Callable<
	f extends (...args: never[]) => unknown,
	attachments extends object = {}
> extends NoopBase<f & attachments> {
	constructor(
		f: f,
		...[opts]: {} extends attachments ? [opts?: CallableOptions<attachments>]
		:	[opts: CallableOptions<attachments>]
	) {
		super()
		return Object.assign(
			Object.setPrototypeOf(
				f.bind(opts?.bind ?? this),
				this.constructor.prototype
			),
			opts?.attach
		)
	}
}

export type Guardable<input = unknown, narrowed extends input = input> =
	| ((In: input) => In is narrowed)
	| ((In: input) => boolean)

/**
 * Checks if the environment has Content Security Policy (CSP) enabled,
 * preventing JIT-optimized code from being compiled via new Function().
 *
 * @returns `true` if a function created using new Function() can be
 * successfully invoked in the environment, `false` otherwise.
 *
 * The result is cached for subsequent invocations.
 */
export const envHasCsp = cachedThunk((): boolean => {
	try {
		return new Function("return false")()
	} catch (e) {
		return true
	}
})
