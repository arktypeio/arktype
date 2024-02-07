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

export type CoercibleValue = string | number | boolean | null | undefined

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
	readonly body = ""

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

	protected indentationCount = 0
	protected get indent() {
		return " ".repeat(this.indentationCount)
	}

	line(statement: string) {
		;(this.body as any) += `${this.indent}${statement}\n`
		return this
	}

	const(identifier: string, expression: CoercibleValue) {
		this.line(`const ${identifier} = ${expression}`)
		return this
	}

	let(identifier: string, expression: CoercibleValue) {
		return this.line(`let ${identifier} = ${expression}`)
	}

	set(identifier: string, expression: CoercibleValue) {
		return this.line(`${identifier} = ${expression}`)
	}

	if(condition: string, then: () => void) {
		return this.block(`if (${condition})`, then)
	}

	elseIf(condition: string, then: () => void) {
		return this.block(`else if (${condition})`, then)
	}

	else(then: () => void) {
		return this.block("else", then)
	}

	/** Current index is "i" */
	for(until: string, body: () => void) {
		return this.block(`for (let i = 0; ${until}; i++)`, body)
	}

	/** Current key is "k" */
	forIn(object: string, body: () => void) {
		return this.block(`for (const k in ${object})`, body)
	}

	block(prefix: string, contents: () => void) {
		this.line(`${prefix} {`)
		this.indentationCount += 4
		contents()
		this.indentationCount -= 4
		return this.line("}")
	}

	return(expression: CoercibleValue) {
		return this.line(`return ${expression}`)
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
