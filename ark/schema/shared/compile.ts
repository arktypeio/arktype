import {
	CastableBase,
	DynamicFunction,
	hasDomain,
	isArray,
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

	get body(): string {
		return this.lines.join("")
	}

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

	index(key: string | number, optional = false): string {
		return indexPropAccess(`${key}`, optional)
	}

	line(statement: string): this {
		this.lines.push(`${" ".repeat(this.indentation)}${statement}\n`)
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

	write(name = "anonymous", indent: number = 0): string {
		return `${name}(${this.argNames.join(", ")}) { ${
			indent ?
				this.body
					.split("\n")
					.map(l => " ".repeat(indent) + `${l}`)
					.join("\n")
			:	this.body
		} }`
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
	bind?: string
}

export interface TransformKeyOptions {
	keyExpression?: string
	condition?: string
	onChange?: () => unknown
}

export interface TransformStep {
	node: BaseNode
	condition?: string
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
	checksTransformErrors = false

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
		// Allows adds no errors to ctx, so a predicate reading it runs in a branch
		if (
			typeof node !== "string" &&
			this.traversalKind === "Transform" &&
			kind === "Allows" &&
			node.allowsRequiresContext
		) {
			return node.allowsRequiresTraversal ?
					`${this.ctx}.allows(${this.ref(node)}, ${arg})`
				:	`${this.ref(node)}.allows(${arg})`
		}
		const requiresContext =
			typeof node === "string" ? true : this.requiresContextFor(node, kind)
		const id = typeof node === "string" ? node : node.id
		if (requiresContext)
			return `${this.referenceToId(id, opts)}(${arg}, ${this.ctx})`

		return `${this.referenceToId(id, opts)}(${arg})`
	}

	invokeMember(node: BaseNode, member: BaseNode = node): this {
		if (this.traversalKind !== "Apply" || !member.includesAlias)
			return this.line(this.invoke(node))
		return this.if(
			`ctx.enterResolution("${member.id}", ${this.data}) === undefined`,
			() => this.line(this.invoke(node)).line("ctx.exitResolution()")
		)
	}

	referenceToId(id: NodeId, opts?: ReferenceOptions): string {
		const invokedKind = opts?.kind ?? this.traversalKind
		const base = `${id}${invokedKind}`
		return opts?.bind ? `${base}.bind(${opts?.bind})` : base
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

		const pushesPath =
			this.traversalKind === "Allows" ?
				node.allowsRequiresTraversal
			:	this.requiresContextFor(node)
		if (pushesPath) this.line(`${this.ctx}.path.push(${keyExpression})`)

		this.check(node, {
			arg: accessExpression
		})
		if (pushesPath) this.line(`${this.ctx}.path.pop()`)

		return this
	}

	initializeTransform(transformedChildren: readonly BaseNode[]): this {
		this.checksTransformErrors = transformedChildren.some(
			child => child.includesMorph || child.transformRequiresContext
		)
		if (!this.checksTransformErrors) return this
		return this.requiresContext ?
				this.initializeErrorCount()
			:	this.line("let failed")
	}

	transformKey(
		name: string,
		input: string,
		node: BaseNode | readonly TransformStep[],
		opts?: TransformKeyOptions
	): this {
		const steps: readonly TransformStep[] = isArray(node) ? node : [{ node }]
		const nodes = steps.map(step => step.node)
		const keyExpression = opts?.keyExpression
		const assign = (assignee: string, node: BaseNode, arg: string) => {
			const pushesKey =
				keyExpression !== undefined && node.transformRequiresContext
			if (pushesKey) this.line(`${this.ctx}.path.push(${keyExpression})`)
			this.line(`${assignee} = ${this.invoke(node, { arg })}`)
			return pushesKey ? this.line(`${this.ctx}.path.pop()`) : this
		}
		const isTransformErrors = () =>
			`typeof ${name} === "object" && ${name} instanceof ${this.ref(TransformErrors)}`
		const assignSteps = () => {
			const errorCount = `${name}ErrorCount`
			if (nodes.slice(0, -1).some(node => node.transformRequiresContext))
				this.const(errorCount, `${this.ctx}.currentErrorCount`)
			for (let i = 0; i < steps.length; i++) {
				const { node, condition } = steps[i]
				const previous = nodes.slice(0, i)
				const conditions = condition ? [condition] : []
				if (previous.some(returnsTransformErrors))
					conditions.push(`!(${isTransformErrors()})`)
				if (previous.some(node => node.transformRequiresContext))
					conditions.push(`${this.ctx}.currentErrorCount === ${errorCount}`)
				const assignStep = () => assign(name, node, i === 0 ? input : name)
				if (conditions.length) this.if(conditions.join(" && "), assignStep)
				else assignStep()
			}
			return this
		}
		if (steps.length === 1 && !steps[0].condition && !opts?.condition)
			assign(`const ${name}`, steps[0].node, input)
		else {
			this.let(name, input)
			if (opts?.condition) this.if(opts.condition, assignSteps)
			else assignSteps()
		}
		const onChange = (): this => {
			opts?.onChange?.()
			return this
		}
		const checksErrors = nodes.some(returnsTransformErrors)
		if (!checksErrors && !opts?.onChange) return this
		return this.if(this.compareTransformed(nodes, name, "!==", input), () => {
			if (!checksErrors) return onChange()
			const key = keyExpression === undefined ? "" : `, ${keyExpression}`
			this.if(isTransformErrors(), () =>
				this.line(
					this.requiresContext ?
						`${this.ctx}.addTransformErrors(${name}${key})`
					:	`failed = ${name}.addTo(failed${key})`
				)
			)
			return opts?.onChange ? this.else(onChange) : this
		})
	}

	compareTransformed(
		nodes: readonly BaseNode[],
		transformed: string,
		operator: "===" | "!==",
		input: string
	): string {
		const canChangeSignOfZero = nodes.some(
			node =>
				node.isRoot() && node.branches.some(n => !n.hasKind("intersection"))
		)
		return canChangeSignOfZero ?
				`${operator === "===" ? "" : "!"}Object.is(${transformed}, ${input})`
			:	`${transformed} ${operator} ${input}`
	}

	returnIfTransformFailed(): this {
		if (!this.checksTransformErrors) return this
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

const returnsTransformErrors = (node: BaseNode): boolean =>
	node.includesMorph && !node.transformRequiresContext

const isDecidedByAllows = (node: BaseNode): boolean => {
	if (node.includesTransform || node.allowsRequiresContext) return false
	for (const id in node.referencesById)
		if (node.referencesById[id].hasKind("predicate")) return false
	return true
}
