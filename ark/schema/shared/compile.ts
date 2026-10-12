import {
	CastableBase,
	DynamicFunction,
	hasDomain,
	isDotAccessible,
	serializePrimitive,
	type Fn
} from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { NodeId } from "../parse.ts"
import type { BaseErrorContext } from "./declare.ts"
import {
	registerBuilderCompiler,
	type ArkErrorCode,
	type ErrorBuilder
} from "./errors.ts"
import type { FailureSite } from "./issues.ts"
import { registeredReference } from "./registry.ts"
import { mergeTransformed, TransformErrors } from "./transform.ts"
import {
	addTransformErrors,
	allowsInBranchBy,
	enterResolution,
	exitResolution,
	transformedInApply,
	transformIfAllowed,
	transformResolution,
	transformsValid,
	type TraversalKind
} from "./traversal.ts"

export const writeErrorBuilder = (context: object): string => {
	let body = "return { data, path"
	for (const k in context) {
		const key = JSON.stringify(k)
		body += `, ${key}: context[${key}]`
	}
	// the text written when its errors are read has slots from the start
	for (const k of writtenSlots) if (!(k in context)) body += `, ${k}: undefined`
	return `${body} }\n`
}

const writtenSlots = ["propString", "expected", "actual", "problem", "message"]

registerBuilderCompiler(
	context =>
		new DynamicFunction<ErrorBuilder>(
			"context",
			"path",
			"data",
			writeErrorBuilder(context)
		)
)

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
	signature?: BaseNode
}

// what an issue says its data must be, as en writes it where nothing else is configured
export const expectedOf = <description extends string | undefined>(
	meta: ArkEnv.meta,
	description: description
): string | description =>
	typeof meta.expected === "string" ? meta.expected : description

const sitesByContext = new WeakMap<BaseErrorContext, FailureSite>()

// a site only traversal reads, so a standalone build writes it as it is rather than as a value a program could reach
export const failureSites = new WeakSet<object>()

export declare namespace NodeCompiler {
	export interface Context {
		kind: TraversalKind
		requiresContext?: boolean
		refs?: Refs
		errorContexts?: ErrorContexts
		raisesIssues?: boolean | undefined
		referencesText?: ((text: string) => boolean) | undefined
	}

	export type Refs = Map<object | symbol, string>

	export type ErrorContexts = BaseErrorContext[]
}

export class NodeCompiler extends CompiledFunction<Fn, ["data", "ctx"]> {
	traversalKind: TraversalKind
	requiresContext: boolean
	readonly refs: NodeCompiler.Refs | undefined
	readonly errorContexts: NodeCompiler.ErrorContexts | undefined
	readonly raisesIssues: boolean
	readonly referencesText: ((text: string) => boolean) | undefined
	checksTransformErrors = false

	constructor(ctx: NodeCompiler.Context) {
		super("data", "ctx")
		this.traversalKind = ctx.kind
		this.requiresContext = ctx.requiresContext ?? true
		this.refs = ctx.refs
		this.errorContexts = ctx.errorContexts
		this.raisesIssues = ctx.raisesIssues ?? false
		this.referencesText = ctx.referencesText
	}

	invoke(node: BaseNode | NodeId, opts?: InvokeOptions): string {
		const arg = opts?.arg ?? this.data
		if (typeof node === "string")
			return `${this.referenceToId(node, opts)}(${arg}, ${this.ctx})`
		const kind = opts?.kind ?? this.traversalKind
		if (
			this.traversalKind === "Transform" &&
			kind === "Allows" &&
			node.allowsRequiresContext
		)
			return this.allows(node, arg)
		const reference = this.referenceToId(node.id, opts)
		if (kind === "Transform" && node.isTransformedById)
			return `${this.ref(transformResolution)}(${this.ctx}, "${this.nameOf(node.id)}", ${arg}, ${reference})`
		return this.requiresContextFor(node, kind) ?
				`${reference}(${arg}, ${this.ctx})`
			:	`${reference}(${arg})`
	}

	// Allows adds no errors to ctx, so a predicate reading it runs in a branch
	allows(node: BaseNode, arg: string = this.data): string {
		if (!node.allowsRequiresContext)
			return this.invoke(node, { arg, kind: "Allows" })
		return node.allowsRequiresTraversal ?
				`${this.ref(allowsInBranchBy)}(${this.ctx}, ${this.referenceToId(node.id, { kind: "Allows" })}, ${arg})`
			:	`${this.ref(node)}.allows(${arg})`
	}

	invokeMember(
		node: BaseNode,
		member: BaseNode = node,
		arg: string = this.data
	): this {
		if (this.traversalKind !== "Apply" || !member.includesAlias)
			return this.line(this.invoke(node, { arg }))
		return this.invokeResolution(node, member.id, arg)
	}

	invokeResolution(node: BaseNode, id: NodeId, arg: string = this.data): this {
		const apply = this.referenceToId(node.id, { kind: "Apply" })
		return this.if(
			`${this.ref(enterResolution)}(ctx, "${this.nameOf(id)}", ${arg}, ${apply}) === undefined`,
			() =>
				this.line(this.invoke(node, { arg })).line(
					`${this.ref(exitResolution)}(ctx)`
				)
		)
	}

	referenceToId(id: NodeId, opts?: ReferenceOptions): string {
		const invokedKind = opts?.kind ?? this.traversalKind
		const base = `${this.nameOf(id)}${invokedKind}`
		return opts?.bind ? `${base}.bind(${opts?.bind})` : base
	}

	// overriding it renames each node everywhere emitted code names it
	nameOf(id: NodeId): string {
		return id
	}

	override prop(key: PropertyKey, optional = false): string {
		return typeof key === "symbol" ?
				indexPropAccess(this.ref(key), optional)
			:	super.prop(key, optional)
	}

	serialize(value: unknown): string {
		return hasDomain(value, "object") || typeof value === "symbol" ?
				this.ref(value)
			:	serializePrimitive(value as never)
	}

	// a text code can't hold, like one printing a function a factory receives, is referenced instead
	text(value: string): string {
		return this.referencesText?.(value) ?
				this.ref(value as never)
			:	JSON.stringify(value)
	}

	ref(value: object | symbol): string {
		if (!this.refs) return registeredReference(value)
		let name = this.refs.get(value)
		if (name === undefined) this.refs.set(value, (name = `r${this.refs.size}`))
		return name
	}

	// a standalone validator's issue holds what its node describes rather than its context, so its site holds only that
	error(context: BaseErrorContext, key?: string): string {
		if (!this.raisesIssues)
			return `ctx.errorFromNodeContext(${this.errorContext(context)}, data)`
		let site = sitesByContext.get(context)
		if (!site) {
			const code = context.code as ArkErrorCode
			failureSites.add(
				(site =
					code === "required" ?
						{ missing: { code } }
					:	{
							value: {
								code,
								description: expectedOf(context.meta, context.description)
							}
						})
			)
			sitesByContext.set(context, site)
		}
		return `ctx.failsAt(${this.ref(site)}, data${key === undefined ? "" : `, ${key}`})`
	}

	errorContext(errorContext: BaseErrorContext): string {
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
				node.allowsRequiresContext && node.allowsRequiresTraversal
			:	this.requiresContextFor(node)
		if (pushesPath) this.line(`${this.ctx}.path.push(${keyExpression})`)

		const apply = () =>
			node.entersResolution ?
				this.invokeMember(node, node, accessExpression)
			:	this.check(node, { arg: accessExpression })
		if (this.traversalKind !== "Apply")
			this.check(node, { arg: accessExpression })
		else if (!node.transforms) apply()
		else if (node.includesAlias) {
			this.if(
				`!${this.ref(transformIfAllowed)}(ctx, ${this.ref(node)}, ${accessExpression})`,
				apply
			)
		} else {
			this.if(
				`${this.ref(transformsValid)}(ctx) && ${this.allows(node, accessExpression)}`,
				() =>
					this.line(
						`${this.ref(transformedInApply)}(ctx, ${this.invoke(node, { arg: accessExpression, kind: "Transform" })})`
					)
			).else(apply)
		}
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
		steps: readonly TransformStep[],
		opts?: TransformKeyOptions
	): this {
		const nodes = steps.map(step => step.node)
		const keyExpression = opts?.keyExpression
		const assign = (assignee: string, node: BaseNode, arg: string) => {
			const pushesKey =
				keyExpression !== undefined && node.transformRequiresContext
			if (pushesKey) this.line(`${this.ctx}.path.push(${keyExpression})`)
			// a step rejecting an earlier step's output transforms the input instead
			const transformed =
				arg === input ?
					this.invoke(node, { arg })
				:	`${arg} === ${input} || ${this.ref(node)}.allows(${arg}) ? ${this.invoke(node, { arg })} : ${this.ref(mergeTransformed)}(${input}, ${arg}, ${this.invoke(node, { arg: input })})`
			this.line(`${assignee} = ${transformed}`)
			return pushesKey ? this.line(`${this.ctx}.path.pop()`) : this
		}
		const isTransformErrors = () =>
			`typeof ${name} === "object" && ${name} instanceof ${this.ref(TransformErrors)}`
		const assignSteps = () => {
			const errorCount = `${name}ErrorCount`
			if (nodes.slice(0, -1).some(node => node.transformRequiresContext))
				this.const(errorCount, `${this.ctx}.currentErrorCount`)
			for (let i = 0; i < steps.length; i++) {
				const { node, signature } = steps[i]
				const previous = nodes.slice(0, i)
				const conditions =
					signature ?
						[this.invoke(signature, { arg: keyExpression!, kind: "Allows" })]
					:	[]
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
		if (steps.length === 1 && !steps[0].signature && !opts?.condition)
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
		return this.if(this.compareTransformed(steps, name, "!==", input), () => {
			if (!checksErrors) return onChange()
			this.if(isTransformErrors(), () =>
				this.addTransformErrors(name, keyExpression)
			)
			return opts?.onChange ? this.else(onChange) : this
		})
	}

	addTransformErrors(errors: string, keyExpression?: string): this {
		const key = keyExpression === undefined ? "" : `, ${keyExpression}`
		return this.line(
			this.requiresContext ?
				`${this.ref(addTransformErrors)}(${this.ctx}, ${errors}${key})`
			:	`failed = ${errors}.addTo(failed${key})`
		)
	}

	compareTransformed(
		steps: readonly TransformStep[],
		transformed: string,
		operator: "===" | "!==",
		input: string
	): string {
		const canChangeSignOfZero = steps.some(
			({ node }) =>
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

export const returnsTransformErrors = (node: BaseNode): boolean =>
	node.includesMorph && !node.transformRequiresContext

const isDecidedByAllows = (node: BaseNode): boolean => {
	if (node.includesTransform || node.allowsRequiresContext) return false
	for (const id in node.referencesById)
		if (node.referencesById[id].hasKind("predicate")) return false
	return true
}
