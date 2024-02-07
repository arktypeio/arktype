import { DynamicFunction } from "./functions.js"
import { CastableBase } from "./records.js"
import { isDotAccessible, reference } from "./registry.js"

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

	indentationCount = 0
	protected get indent() {
		return " ".repeat(this.indentationCount)
	}

	prop(root: string, key: PropertyKey, optional = false) {
		if (typeof key === "string" && isDotAccessible(key)) {
			return `${root}${optional ? "?" : ""}.${key}`
		}
		return this.index(
			root,
			typeof key === "symbol" ? reference(key) : JSON.stringify(key),
			optional
		)
	}

	index(root: string, key: string, optional = false) {
		return `${root}${optional ? "?." : ""}[${key}]`
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

	if(condition: string, then: () => this) {
		return this.block(`if (${condition})`, then)
	}

	elseIf(condition: string, then: () => this) {
		return this.block(`else if (${condition})`, then)
	}

	else(then: () => this) {
		return this.block("else", then)
	}

	/** Current index is "i" */
	for(until: string, body: () => this) {
		return this.block(`for (let i = 0; ${until}; i++)`, body)
	}

	/** Current key is "k" */
	forIn(object: string, body: () => this) {
		return this.block(`for (const k in ${object})`, body)
	}

	block(prefix: string, contents: () => this) {
		this.line(`${prefix} {`)
		this.indentationCount += 4
		contents()
		this.indentationCount -= 4
		return this.line("}")
	}

	return(expression: CoercibleValue = "") {
		return this.line(`return ${expression}`)
	}

	compile() {
		return new DynamicFunction<(...args: argTypes) => returns>(
			...this.args,
			this.body
		)
	}
}
