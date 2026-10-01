import {
	CastableBase,
	DynamicFunction,
	hasDomain,
	isDotAccessible,
	serializePrimitive,
	type Fn,
	type dict
} from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { NodeId } from "../parse.ts"
import { registeredReference } from "./registry.ts"
import { TransformErrors, type TraversalKind } from "./traversal.ts"

export type CoercibleValue = string | number | boolean | null | undefined

export class CompiledFunction<
	compiledSignature = (...args: unknown[]) => unknown,
	args extends readonly string[] = readonly string[]
> extends CastableBase<{
	[k in args[number]]: k
}> {
	readonly argNames: args
	private readonly lines: string[] = []

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
		return compileLiteralPropAccess(key, optional)
	}

	get body(): string {
		return this.lines.join("")
	}

	line(statement: string): this {
		this.lines.push(`${" ".repeat(this.indentation)}${statement}\n`)
		return this
	}

	const(identifier: string, expression: CoercibleValue): this {
		this.line(`const ${identifier} = ${expression}`)
		return this
	}

	if(condition: string, then: (self: this) => this): this {
		return this.block(`if (${condition})`, then)
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
		return this.loop(`for (let i = ${initialValue}; ${until}; i++)`, body)
	}

	/** Current key is "k" */
	forIn(object: string, body: (self: this) => this): this {
		return this.loop(`for (const k in ${object})`, body)
	}

	loopDepth = 0
	loop(prefix: string, body: (self: this) => this): this {
		this.loopDepth++
		this.block(prefix, body)
		this.loopDepth--
		return this
	}

	block(prefix: string, contents: (self: this) => this, suffix = ""): this {
		this.line(`${prefix} {`)
		this.indent()
		contents(this)
		this.dedent()
		return this.line(`}${suffix}`)
	}

	return(expression: CoercibleValue = ""): this {
		return this.line(`return ${expression}`)
	}

	write(name = "anonymous"): string {
		return `${name}(${this.argNames.join(", ")}) { ${this.body} }`
	}

	compile(): compiledSignature {
		return new DynamicFunction(...this.argNames, this.body) as never
	}
}

export const compileSerializedValue = (value: unknown): string =>
	hasDomain(value, "object") || typeof value === "symbol" ?
		registeredReference(value)
	:	serializePrimitive(value as never)

export const compileLiteralPropAccess = (
	key: PropertyKey,
	optional = false
): string => {
	if (typeof key === "string" && isDotAccessible(key))
		return `${optional ? "?" : ""}.${key}`

	return indexPropAccess(serializeLiteralKey(key), optional)
}

export const serializeLiteralKey = (key: PropertyKey): string =>
	typeof key === "symbol" ? registeredReference(key) : JSON.stringify(key)

export const indexPropAccess = (key: string, optional = false): string =>
	`${optional ? "?." : ""}[${key}]`

export interface InvokeOptions extends ReferenceOptions {
	arg?: string
}

export interface ReferenceOptions {
	kind?: TraversalKind
}

export interface TransformKeyOptions {
	keyExpression?: string
	condition?: string
	onChange?: () => unknown
}

export declare namespace NodeCompiler {
	export interface Context {
		kind: TraversalKind
		requiresContext?: boolean
		refs?: Refs
		errorContexts?: ErrorContexts
	}

	export type Refs = Map<object | symbol, string>

	export type ErrorContexts = object[]
}

export class NodeCompiler extends CompiledFunction<Fn, ["data", "ctx"]> {
	traversalKind: TraversalKind
	requiresContext: boolean
	readonly refs: NodeCompiler.Refs | undefined
	readonly errorContexts: NodeCompiler.ErrorContexts | undefined

	constructor(ctx: NodeCompiler.Context) {
		super("data", "ctx")
		this.traversalKind = ctx.kind
		this.requiresContext = ctx.requiresContext ?? true
		this.refs = ctx.refs
		this.errorContexts = ctx.errorContexts
	}

	invoke(node: BaseNode | NodeId, opts?: InvokeOptions): string {
		const arg = opts?.arg ?? this.data
		const kind = opts?.kind ?? this.traversalKind
		// its predicates' errors go to a Traversal of its own rather than ctx
		if (
			typeof node !== "string" &&
			this.traversalKind === "Transform" &&
			kind === "Allows" &&
			node.allowsRequiresContext
		)
			return `${this.ref(node)}.allows(${arg})`
		const requiresContext =
			typeof node === "string" ? true : this.requiresContextFor(node, kind)
		const id = typeof node === "string" ? node : node.id
		const reference = this.referenceToId(id, { kind })
		if (requiresContext) return `${reference}(${arg}, ${this.ctx})`

		return `${reference}(${arg})`
	}

	referenceToId(id: NodeId, opts?: ReferenceOptions): string {
		return opts?.kind ? `${id}${opts.kind}` : id
	}

	ref(value: object | symbol): string {
		if (!this.refs) return registeredReference(value)
		let name = this.refs.get(value)
		if (name === undefined) this.refs.set(value, (name = `r${this.refs.size}`))
		return name
	}

	errorContext(errorContext: object): string {
		for (const k in errorContext) {
			if (Object.is((errorContext as dict)[k], -0))
				errorContext = { ...errorContext, [k]: 0 }
		}
		if (!this.errorContexts) return registeredReference(errorContext)
		return `errorContexts[${this.errorContexts.push(errorContext) - 1}]`
	}

	requiresContextFor(node: BaseNode, kind = this.traversalKind): boolean {
		return (
			this.traversalKind === "Apply" ||
			(kind === "Transform" ?
				node.transformRequiresContext
			:	node.allowsRequiresContext)
		)
	}

	initializeErrorCount(): this {
		return this.const("errorCount", "ctx.currentErrorCount")
	}

	returnIfFail(): this {
		return this.if("ctx.currentErrorCount > errorCount", () => this.return())
	}

	returnIfFailFast(): this {
		return this.if("ctx.failFast && ctx.currentErrorCount > errorCount", () =>
			this.return()
		)
	}

	traverseKey(
		keyExpression: string,
		accessExpression: string,
		node: BaseNode
	): this {
		if (
			this.traversalKind === "Apply" &&
			(this.loopDepth > 0 ||
				(node.hasKind("union") && !node.compiledDiscriminant)) &&
			isDecidedByAllows(node)
		) {
			return this.if(
				`!${this.invoke(node, { arg: accessExpression, kind: "Allows" })}`,
				() =>
					this.line(`${this.ctx}.path.push(${keyExpression})`)
						.check(node, { arg: accessExpression })
						.line(`${this.ctx}.path.pop()`)
			)
		}

		const requiresContext = this.requiresContextFor(node)
		if (requiresContext) this.line(`${this.ctx}.path.push(${keyExpression})`)

		this.check(node, {
			arg: accessExpression
		})
		if (requiresContext) this.line(`${this.ctx}.path.pop()`)

		return this
	}

	initializeTransform(): this {
		return this.requiresContext ?
				this.initializeErrorCount()
			:	this.line("let failed")
	}

	transformKey(
		name: string,
		accessExpression: string,
		node: BaseNode,
		opts?: TransformKeyOptions
	): this {
		const keyExpression = opts?.keyExpression
		const pushesKey =
			keyExpression !== undefined && node.transformRequiresContext
		const assign = (assignee: string) => {
			if (pushesKey) this.line(`${this.ctx}.path.push(${keyExpression})`)
			this.line(`${assignee} = ${this.invoke(node, { arg: accessExpression })}`)
			return pushesKey ? this.line(`${this.ctx}.path.pop()`) : this
		}
		if (opts?.condition) {
			this.line(`let ${name} = ${accessExpression}`)
			this.if(opts.condition, () => assign(name))
		} else assign(`const ${name}`)
		const onChange = (): this => {
			opts?.onChange?.()
			return this
		}
		const checksErrors = node.includesMorph && !node.transformRequiresContext
		if (!checksErrors && !opts?.onChange) return this
		return this.if(`${name} !== ${accessExpression}`, () => {
			if (!checksErrors) return onChange()
			const key = keyExpression === undefined ? "" : `, ${keyExpression}`
			this.if(
				`typeof ${name} === "object" && ${name} instanceof ${this.ref(TransformErrors)}`,
				() =>
					this.line(
						this.requiresContext ?
							`${this.ctx}.addTransformErrors(${name}${key})`
						:	`failed = ${name}.addTo(failed${key})`
					)
			)
			return opts?.onChange ? this.else(onChange) : this
		})
	}

	returnIfTransformFailed(): this {
		return this.requiresContext ?
				this.if("ctx.currentErrorCount > errorCount", () => this.return("data"))
			:	this.if("failed", () => this.return("failed"))
	}

	check(node: BaseNode, opts?: InvokeOptions): this {
		return this.traversalKind === "Allows" ?
				this.if(`!${this.invoke(node, opts)}`, () => this.return(false))
			:	this.line(this.invoke(node, opts))
	}
}

const isDecidedByAllows = (node: BaseNode): boolean => {
	if (node.includesTransform || node.allowsRequiresContext) return false
	for (const id in node.referencesById)
		if (node.referencesById[id].hasKind("predicate")) return false
	return true
}
