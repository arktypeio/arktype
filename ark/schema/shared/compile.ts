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
import type { TraversalKind } from "./traversal.ts"

export type CoercibleValue = string | number | boolean | null | undefined

// builders writing the body of a loop, which runs once for each element or
// key of the data
const writingLoop = new WeakSet<CompiledFunction<any, any>>()

const loopBlock = <js extends CompiledFunction<any, any>>(
	js: js,
	prefix: string,
	body: (self: js) => js
): js => {
	if (writingLoop.has(js)) return js.block(prefix, body)
	writingLoop.add(js)
	js.block(prefix, body)
	writingLoop.delete(js)
	return js
}

export class CompiledFunction<
	compiledSignature = (...args: unknown[]) => unknown,
	args extends readonly string[] = readonly string[]
> extends CastableBase<{
	[k in args[number]]: k
}> {
	readonly argNames: args
	// joined into the body when it is read, which leaves it one flat string,
	// where appending each line to it would leave a string per line, held by
	// every node whose source it is
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
		return loopBlock(this, `for (let i = ${initialValue}; ${until}; i++)`, body)
	}

	/** Current key is "k" */
	forIn(object: string, body: (self: this) => this): this {
		return loopBlock(this, `for (const k in ${object})`, body)
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

export declare namespace NodeCompiler {
	export interface Context {
		kind: TraversalKind
		optimistic?: true
		refs?: Refs
		errorContexts?: ErrorContexts
	}

	/** each value a unit's traversals read, by the unit parameter naming it */
	export type Refs = Map<object | symbol, string>

	/** each error context a unit's error paths report, by index */
	export type ErrorContexts = object[]
}

// the Apply of a node that can't transform a value or read context adds no
// error to a value its Allows accepts and does nothing else, so such a value
// can skip it. A node that calls a predicate is left out, so that a rejected
// value doesn't call the predicate a second time.
const isDecidedByAllows = (node: BaseNode): boolean => {
	if (node.includesTransform || node.allowsRequiresContext) return false
	for (const id in node.referencesById)
		if (node.referencesById[id].hasKind("predicate")) return false
	return true
}

export class NodeCompiler extends CompiledFunction<Fn, ["data", "ctx"]> {
	traversalKind: TraversalKind
	optimistic: boolean
	readonly refs: NodeCompiler.Refs | undefined
	readonly errorContexts: NodeCompiler.ErrorContexts | undefined

	constructor(ctx: NodeCompiler.Context) {
		super("data", "ctx")
		this.traversalKind = ctx.kind
		this.optimistic = ctx.optimistic === true
		this.refs = ctx.refs
		this.errorContexts = ctx.errorContexts
	}

	invoke(node: BaseNode | NodeId, opts?: InvokeOptions): string {
		const arg = opts?.arg ?? this.data
		const requiresContext =
			typeof node === "string" ? true : this.requiresContextFor(node)
		const id = typeof node === "string" ? node : node.id
		const reference = this.referenceToId(id, {
			...opts,
			kind: opts?.kind ?? this.traversalKind
		})
		if (requiresContext) return `${reference}(${arg}, ${this.ctx})`

		return `${reference}(${arg})`
	}

	// how emitted code names a node: with a kind, its traversal of that kind,
	// declared under this name by its unit; without one, the node itself, e.g.
	// as its key in ctx.seen. Overriding it renames every traversal a unit
	// declares or invokes and every seen key consistently. A node a morph
	// pipes to is not named: ctx.queueMorphs is passed the node itself, as a
	// value read through ref.
	referenceToId(id: NodeId, opts?: ReferenceOptions): string {
		return opts?.kind ? `${id}${opts.kind}` : id
	}

	// names a value emitted code reads. In a unit, the name is a parameter of
	// the unit, shared by its traversals and numbered by first read, so a read
	// is a closure variable rather than a lookup on the registry (which is in
	// dictionary mode). Outside a unit, it is the value's registered reference.
	ref(value: object | symbol): string {
		if (!this.refs) return registeredReference(value)
		let name = this.refs.get(value)
		if (name === undefined) this.refs.set(value, (name = `r${this.refs.size}`))
		return name
	}

	// names an error context an error path reports. errorFromNodeContext
	// copies a context's entries, so every error can be reported with one
	// object. In a unit, it is an element of errorContexts, an array the unit
	// is passed, rather than a ref: a unit reports errors for most nodes it
	// declares, and V8 can't call a function with more than about 65,000
	// arguments. Outside a unit, it is the context's registered reference.
	// Compiled code reports a -0 in a context as 0 (interpreted code, as -0).
	errorContext(errorContext: object): string {
		for (const k in errorContext) {
			if (Object.is((errorContext as dict)[k], -0))
				errorContext = { ...errorContext, [k]: 0 }
		}
		if (!this.errorContexts) return registeredReference(errorContext)
		return `errorContexts[${this.errorContexts.push(errorContext) - 1}]`
	}

	requiresContextFor(node: BaseNode): boolean {
		return this.traversalKind === "Apply" || node.allowsRequiresContext
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
		// checking a child with Allows before applying it runs the checks of a
		// value Allows rejects once more, so gates nested along a failing path
		// would each add a run. Apply gates only where what it skips scales: a
		// key in a loop, traversed for each element or key of the data, or a
		// union checking its branches in order, whose Apply records an error for
		// each branch that fails before one passes. A union switching on its
		// discriminant applies only the branch matching it, so like a nested
		// object, it isn't gated. A rejected value's checks then run once more
		// per loop or gated union around it.
		if (
			this.traversalKind === "Apply" &&
			(writingLoop.has(this) ||
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

	check(node: BaseNode, opts?: InvokeOptions): this {
		return this.traversalKind === "Allows" ?
				this.if(`!${this.invoke(node, opts)}`, () => this.return(false))
			:	this.line(this.invoke(node, opts))
	}
}
