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

export class CompiledFunction<
	args extends readonly string[],
	argTypes extends { [i in keyof args]: unknown } = {
		[i in keyof args]: never
	},
	returns = unknown
> extends CastableBase<{
	[k in args[number]]: k
}> {
	readonly args: args
	body = ""

	constructor(...args: args) {
		super()
		this.args = args
		for (const arg of args) {
			if (arg in this) {
				throw new Error(
					`Arg name '${arg}' would overwrite an existing property on FunctionBody`
				)
			}
			;(this as any)[arg] = arg
		}
	}

	line(statement: string) {
		this.body += `${statement}\n`
		return this
	}

	if(condition: string, then: string) {
		this.body += `if (${condition}) {\n${then}\n}\n`
		return this
	}

	elseIf(condition: string, then: string) {
		this.body += `else if (${condition}) {\n${then}\n}\n`
		return this
	}

	else(then: string) {
		this.body += `else {\n${then}\n}\n`
		return this
	}

	/** Current index is "i" */
	for(until: string, body: string) {
		this.body += `for (let i = 0; ${until}; i++) {\n${body}\n}\n`
		return this
	}

	/** Current key is "k" */
	forIn(object: string, body: string) {
		this.body += `for (const k in ${object}) {\n${body}\n}\n`
		return this
	}

	return(expression: string) {
		this.body += `return ${expression}\n`
		return this
	}

	compile() {
		return new DynamicFunction<(...args: argTypes) => returns>(
			...this.args,
			this.body
		)
	}
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
