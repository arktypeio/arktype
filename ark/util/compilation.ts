import { DynamicFunction } from "./functions.js"
import { CastableBase } from "./records.js"
import { isDotAccessible, reference } from "./registry.js"

export type CoercibleValue = string | number | boolean | null | undefined

export class CompiledFunction<
	args extends readonly string[]
> extends CastableBase<{
	[k in args[number]]: k
}> {
	readonly argNames: args
	readonly body = ""

	constructor(...args: args) {
		super()
		this.argNames = args
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
	indent(): this {
		this.indentation += 4
		return this
	}

	dedent(): this {
		this.indentation -= 4
		return this
	}

	prop(key: PropertyKey, optional = false): string {
		return literalPropAccess(key, optional)
	}

	index(key: string, optional = false): string {
		return indexPropAccess(key, optional)
	}

	line(statement: string): this {
		;(this.body as any) += `${" ".repeat(this.indentation)}${statement}\n`
		return this
	}

	const(identifier: string, expression: CoercibleValue): this {
		this.line(`const ${identifier} = ${expression}`)
		return this
	}

	let(identifier: string, expression: CoercibleValue): this {
		return this.line(`let ${identifier} = ${expression}`)
	}

	set(identifier: string, expression: CoercibleValue): this {
		return this.line(`${identifier} = ${expression}`)
	}

	if(condition: string, then: (self: this) => this): this {
		return this.block(`if (${condition})`, then)
	}

	elseIf(condition: string, then: (self: this) => this): this {
		return this.block(`else if (${condition})`, then)
	}

	else(then: (self: this) => this): this {
		return this.block("else", then)
	}

	/** Current index is "i" */
	for(
		until: string,
		body: (self: this) => this,
		initialValue: CoercibleValue = 0
	): this {
		return this.block(`for (let i = ${initialValue}; ${until}; i++)`, body)
	}

	/** Current key is "k" */
	forIn(object: string, body: (self: this) => this): this {
		return this.block(`for (const k in ${object})`, body)
	}

	block(prefix: string, contents: (self: this) => this): this {
		this.line(`${prefix} {`)
		this.indent()
		contents(this)
		this.dedent()
		return this.line("}")
	}

	return(expression: CoercibleValue = ""): this {
		return this.line(`return ${expression}`)
	}

	compile<
		f extends (
			...args: {
				[i in keyof args]: never
			}
		) => unknown
	>(): f {
		return new DynamicFunction(...this.argNames, this.body)
	}
}

export const literalPropAccess = (
	key: PropertyKey,
	optional = false
): string => {
	if (typeof key === "string" && isDotAccessible(key))
		return `${optional ? "?" : ""}.${key}`

	return indexPropAccess(serializeLiteralKey(key), optional)
}

export const serializeLiteralKey = (key: PropertyKey): string =>
	typeof key === "symbol" ? reference(key) : JSON.stringify(key)

export const indexPropAccess = (key: string, optional = false) =>
	`${optional ? "?." : ""}[${key}]` as const
