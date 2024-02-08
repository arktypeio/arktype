import { DynamicFunction } from "./functions.js"
import { CastableBase } from "./records.js"
import { isDotAccessible, reference } from "./registry.js"

export type CoercibleValue = string | number | boolean | null | undefined

export class CompiledFunction<
	args extends readonly string[]
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

	indentation = 0
	indent() {
		this.indentation += 4
		return this
	}

	dedent() {
		this.indentation -= 4
		return this
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
		;(this.body as any) += `${" ".repeat(this.indentation)}${statement}\n`
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

	if(condition: string, then: (self: this) => this) {
		return this.block(`if (${condition})`, then)
	}

	elseIf(condition: string, then: (self: this) => this) {
		return this.block(`else if (${condition})`, then)
	}

	else(then: (self: this) => this) {
		return this.block("else", then)
	}

	/** Current index is "i" */
	for(until: string, body: (self: this) => this) {
		return this.block(`for (let i = 0; ${until}; i++)`, body)
	}

	/** Current key is "k" */
	forIn(object: string, body: (self: this) => this) {
		return this.block(`for (const k in ${object})`, body)
	}

	block(prefix: string, contents: (self: this) => this) {
		this.line(`${prefix} {`)
		this.indent()
		contents(this)
		this.dedent()
		return this.line("}")
	}

	return(expression: CoercibleValue = "") {
		return this.line(`return ${expression}`)
	}

	compile<
		f extends (
			...args: {
				[i in keyof args]: never
			}
		) => unknown
	>() {
		return new DynamicFunction<f>(...this.args, this.body)
	}
}