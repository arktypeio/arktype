import {
	CastableBase,
	DynamicFunction,
	hasDomain,
	isDotAccessible,
	serializePrimitive,
	type Fn
} from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import type { BaseNode } from "../node.ts"
import type { NodeId } from "../parse.ts"
import type { Predicate } from "../predicate.ts"
import type { IntersectionNode } from "../roots/intersection.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { UnionNode } from "../roots/union.ts"
import type { StructureNode } from "../structure/structure.ts"
import { registerBuilderCompiler, type ErrorBuilder } from "./errors.ts"
import { registeredReference } from "./registry.ts"
import { mergeTransformed, TransformErrors } from "./transform.ts"
import {
	addMorphErrs,
	allowsInBranchBy,
	disallowed,
	enterApplied,
	exitApplied,
	rejected,
	rejects,
	transformedInApply,
	transformIfAllowed,
	transformResolution,
	transformsValid,
	type TraversalKind
} from "./traversal.ts"

const writeErrorBuilder = (context: object): string => {
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

registerBuilderCompiler(context =>
	tryJit(
		() =>
			new DynamicFunction<ErrorBuilder>(
				"context",
				"path",
				"data",
				writeErrorBuilder(context)
			)
	)
)

// a host can allow code generation as arktype loads and refuse it later, as
// workerd does within a request, so the first refusal leaves later nodes jitless
let refusesJit = false

export const canJit = (config: ResolvedConfig): boolean =>
	!config.jitless && !refusesJit

// what jit returns, or undefined once the host refuses to generate code
export const tryJit = <result>(jit: () => result): result | undefined => {
	if (refusesJit) return
	try {
		return jit()
	} catch (e) {
		if (!(e instanceof EvalError)) throw e
		refusesJit = true
	}
}

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

export interface CheckOptions extends InvokeOptions {
	breaks?: boolean
}

export interface ReferenceOptions {
	kind?: TraversalKind
	bind?: string
}

export interface TransformKeyOptions {
	/** the expression of the key a transformed value is written to */
	keyExpr?: string
	condition?: string
	onChange?: () => unknown
}

export type SwitchCase = readonly [label: string, returned: string]

export interface TransformStep {
	node: BaseNode
	signature?: BaseNode
}

// a node's expected, as en writes it unconfigured
export const expectedOf = <description extends string | undefined>(
	meta: ArkEnv.meta,
	description: description
): string | description =>
	typeof meta.expected === "string" ? meta.expected : description

export declare namespace NodeCompiler {
	export interface Context {
		kind: TraversalKind
		/** whether the traversal it compiles takes `ctx` */
		needsCtx?: boolean
		refs?: Refs
	}

	export type Refs = Map<object | symbol, string>
}

export abstract class NodeCompiler extends CompiledFunction<
	Fn,
	["data", "ctx"]
> {
	/** which traversal it compiles: "Allows", "Apply" or "Transform" */
	trav: TraversalKind
	/** whether the traversal it compiles takes `ctx` */
	needsCtx: boolean
	readonly refs: NodeCompiler.Refs | undefined
	// whether a transform writes into the object it receives
	declare readonly inPlace?: boolean
	// whether Apply reports only the first issue it finds, as a build can
	declare readonly reportsFirst?: boolean
	// whether a build writes for size, so Allows returns where it fails
	declare readonly shortest?: boolean
	// whether a copy is a literal of the values it holds rather than one of
	// nulls it fills. V8 gives a field the kind of value first written to it,
	// and one first written a fraction holds it in a box each object
	// allocates, so a copy filling nulls holds data's numbers as they are
	// where data's fields hold any value, as a definition of the same keys in
	// the same order makes them
	declare readonly copiesValues?: boolean
	// whether data is trusted to hold only own, enumerable keys, as
	// JSON.parse's output does, so a count of its keys can stand for a check
	// of each
	declare readonly jsonInput?: boolean
	/** whether the transform it compiles checks for errors a transformed child added */
	checksErrs = false

	constructor(ctx: NodeCompiler.Context) {
		super("data", "ctx")
		this.trav = ctx.kind
		this.needsCtx = ctx.needsCtx ?? true
		this.refs = ctx.refs
	}

	// written by standalone builds, whose issues hold no node contexts
	unionFails?(node: UnionNode): string
	// a discriminated union's failure of data matching none of its cases
	missFails?(node: UnionNode): string
	// a discriminated union's Apply of data in its default case
	defaultFails?(node: UnionNode, caseNode: BaseRoot): string
	undeclaredFails?(node: StructureNode): string
	// the site a required key whose value's condition failed is reported at,
	// as a basis's key is, rather than by applying its value
	failingSiteOf?(prop: BaseNode): string | undefined
	// what a key's value whose condition failed is applied by, if not its Apply
	failingApplyOf?(value: BaseNode): string | undefined
	// whether a predicate can't add issues itself, so Apply needn't count them
	addsNoIssues?(predicate: Predicate): boolean

	// returns the call of a function its unit declares for a rare path
	abstract outline(
		name: string,
		args: readonly string[],
		body: (js: NodeCompiler) => unknown
	): this

	/** an expression calling node's traversal, or a referenced one's by id */
	inv(node: BaseNode | NodeId, opts?: InvokeOptions): string {
		const arg = opts?.arg ?? this.data
		if (typeof node === "string")
			return `${this.refToId(node, opts)}(${arg}, ${this.ctx})`
		const kind = opts?.kind ?? this.trav
		if (this.trav === "Transform" && kind === "Allows" && node.allowsCtx)
			return this.allows(node, arg)
		const reference = this.refToId(node.id, opts)
		if (kind === "Transform" && node.tfsById)
			return `${this.ref(transformResolution)}(${this.ctx}, "${this.nameOf(node.id)}", ${arg}, ${reference})`
		return this.needsCtxFor(node, kind) ?
				`${reference}(${arg}, ${this.ctx})`
			:	`${reference}(${arg})`
	}

	// Allows adds no errors to ctx, so a predicate reading it runs in a branch
	allows(node: BaseNode, arg: string = this.data): string {
		if (!node.allowsCtx) return this.inv(node, { arg, kind: "Allows" })
		return node.checksCtx ?
				`${this.ref(allowsInBranchBy)}(${this.ctx}, ${this.refToId(node.id, { kind: "Allows" })}, ${arg})`
			:	`${this.ref(node)}.allows(${arg})`
	}

	applyMember(node: BaseNode, member: BaseNode = node): string {
		return member.hasAlias ? this.resolution(node, member.id) : this.inv(node)
	}

	// a cycle member is entered as a resolution, so it is applied once
	resolution(node: BaseNode, id: NodeId, arg: string = this.data): string {
		const apply = this.traversal(node, "Apply")
		return `${this.ref(enterApplied)}(ctx, "${this.nameOf(id)}", ${arg}) ?? ${this.ref(exitApplied)}(ctx, ${apply}(${arg}, ctx))`
	}

	/** the expression a compiled traversal calls a node's traversal by */
	refToId(id: NodeId, opts?: ReferenceOptions): string {
		const invokedKind = opts?.kind ?? this.trav
		const base = `${this.nameOf(id)}${invokedKind}`
		return opts?.bind ? `${base}.bind(${opts?.bind})` : base
	}

	// overridden to rename nodes in emitted code
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

	ref(value: object | symbol): string {
		if (!this.refs) return registeredReference(value)
		let name = this.refs.get(value)
		if (name === undefined) this.refs.set(value, (name = `r${this.refs.size}`))
		return name
	}

	site(node: BaseNode): string {
		return this.ref(node.failSite)
	}

	error(node: BaseNode, key?: string, data = "data"): string {
		return this.fails(
			"failsAt",
			`${this.site(node)}, ${data}${key === undefined ? "" : `, ${key}`}`
		)
	}

	// a call reporting a failure into ctx, by FailureContext's short names
	fails(method: "failsAt" | "failsIn", args: string): string {
		return `ctx.${method === "failsAt" ? "_at" : "_in"}(${args})`
	}

	// returns what the case on matches returns, or otherwise. A case returning
	// what the next one does falls through to it
	switch(on: string, cases: readonly SwitchCase[], otherwise: string): this {
		return this.block(`switch(${on})`, () => {
			for (const [i, [label, returned]] of cases.entries()) {
				const next = cases[i + 1]
				const fallsThrough =
					label !== "default" &&
					next?.[0] !== "default" &&
					next?.[1] === returned
				this.line(fallsThrough ? `${label}:` : `${label}: return ${returned}`)
			}
			return this
		}).return(otherwise)
	}

	/** whether `node`'s traversal of `kind` takes `ctx` */
	needsCtxFor(node: BaseNode, kind = this.trav): boolean {
		return (
			this.trav === "Apply" ||
			(kind === "Transform" ? node.tfCtx : node.allowsCtx)
		)
	}

	// rejects data Allows can't read an object's first key from
	rejectNullish(node: BaseNode): this {
		return this.block("switch (data)", () =>
			this.line(`case null: case undefined: return ${this.rejection(node)}`)
		)
	}

	// a transforming object's Allows rejects through disallowed, so the
	// transform after it is compiled with its checks. A build for size
	// returns false
	rejection(node: BaseNode): string {
		return this.trav === "Allows" && !this.shortest && node.tfs ?
				`${this.ref(disallowed)}()`
			:	"false"
	}

	/** writes a const holding the error count, to tell whether a child added errors */
	initErrCount(): this {
		return this.const("errN", "ctx.errN")
	}

	travKey(keyExpr: string, accessExpression: string, node: BaseNode): this {
		const fails = this.keyFails(keyExpr, accessExpression, node)
		if (fails !== undefined) return this.if(fails, () => this.return(false))
		if (this.trav === "Apply")
			return this.applyKey(keyExpr, accessExpression, node)
		// read once, so the string remembered is the one its pattern rejected
		if (this.loopDepth > 0 && isRefinedPattern(node)) {
			const allows = this.traversal(node, "Allows")
			return this.const("value", accessExpression).if(`!${allows}(value)`, () =>
				this.return(`${this.ref(rejected)}(${allows}, value)`)
			)
		}
		// a value whose predicates read ctx is checked at its key's path
		this.line(`${this.ctx}.path.push(${keyExpr})`)
		this.check(node, { arg: accessExpression })
		return this.line(`${this.ctx}.path.pop()`)
	}

	// what fails a key's value in one expression, if one can
	keyFails(key: string, value: string, node: BaseNode): string | undefined {
		if (this.trav !== "Apply") {
			const condition = node.compileCondition?.(this, value)
			if (condition !== undefined) return `!(${condition})`
			if (
				(this.loopDepth > 0 && isRefinedPattern(node)) ||
				(node.allowsCtx && node.checksCtx)
			)
				return
			return `!${this.inv(node, { arg: value })}`
		}
		if (node.hasMorph || node.hasAlias) return
		// transforming values are checked by Allows first
		const checksAllowsFirst =
			node.tfs ||
			((this.loopDepth > 0 || (node.is("union") && !node.discriminant)) &&
				isDecidedByAllows(node))
		const condition =
			node.is("union") && !checksAllowsFirst ?
				undefined
			:	node.compileCondition?.(this, value)
		if (condition !== undefined && !node.is("union"))
			return `!(${condition}) && ${this.error(node, key)}`
		const allows =
			!checksAllowsFirst ? ""
			: isRefinedPattern(node) ?
				`${this.ref(rejects)}(${this.traversal(node, "Allows")}, ${value}) && `
			: condition === undefined ? `!${this.allows(node, value)} && `
			: `!(${condition}) && `
		// a refined basis Allows rejected failed its basis or its refinement
		if (checksAllowsFirst && isRefinedBasis(node))
			return `${allows}${this.fails("failsAt", `${node.basis!.compileCondition(this, value)} ? ${this.site(node.preStruct[0])} : ${this.site(node.basis!)}, data, ${key}`)}`
		return `${allows}${this.fails("failsIn", `${this.traversal(node, "Apply")}, ${this.data}, ${key}`)}`
	}

	// a cyclic value is applied inline
	private applyKey(key: string, value: string, node: BaseNode): this {
		const apply =
			node.entersAlias && node.hasAlias ?
				`(${this.resolution(node, node.id, value)})`
			:	this.inv(node, { arg: value })
		const fails = () => this.line("ctx.path.pop()").return(false)
		this.line(`ctx.path.push(${key})`)
		// only transforming a value Apply finds valid finds its morphs' errors
		if (!node.hasAlias) {
			this.if(
				`${this.ref(transformsValid)}(ctx) && ${this.allows(node, value)}`,
				() =>
					this.line(
						`${this.ref(transformedInApply)}(ctx, ${this.inv(node, { arg: value, kind: "Transform" })})`
					)
			).elseIf(`!${apply}`, fails)
		} else {
			this.if(
				node.tfs ?
					`!(${this.ref(transformIfAllowed)}(ctx, ${this.ref(node)}, ${value}) || ${apply})`
				:	`!${apply}`,
				fails
			)
		}
		return this.line("ctx.path.pop()")
	}

	/** writes what a transform of `transformedChildren` needs before it starts */
	initTf(transformedChildren: readonly BaseNode[]): this {
		this.checksErrs = transformedChildren.some(
			child => child.hasMorph || child.tfCtx
		)
		if (!this.checksErrs) return this
		return this.needsCtx ? this.initErrCount() : this.line("let failed")
	}

	/** writes transforming a key's value through its steps into `name` */
	tfKey(
		name: string,
		input: string,
		steps: readonly TransformStep[],
		opts?: TransformKeyOptions
	): this {
		const nodes = steps.map(step => step.node)
		const keyExpr = opts?.keyExpr
		const assign = (assignee: string, node: BaseNode, arg: string) => {
			const pushesKey = keyExpr !== undefined && node.tfCtx
			if (pushesKey) this.line(`${this.ctx}.path.push(${keyExpr})`)
			// a step rejecting an earlier step's output transforms the input instead
			const transformed =
				arg === input ?
					this.inv(node, { arg })
				:	`${arg} === ${input} || ${this.ref(node)}.allows(${arg}) ? ${this.inv(node, { arg })} : ${this.ref(mergeTransformed)}(${input}, ${arg}, ${this.inv(node, { arg: input })})`
			this.line(`${assignee} = ${transformed}`)
			return pushesKey ? this.line(`${this.ctx}.path.pop()`) : this
		}
		const isTransformErrors = () =>
			`typeof ${name} === "function" && ${name} instanceof ${this.ref(TransformErrors)}`
		const assignSteps = () => {
			const errN = `${name}ErrorCount`
			if (nodes.slice(0, -1).some(node => node.tfCtx))
				this.const(errN, `${this.ctx}.errN`)
			for (let i = 0; i < steps.length; i++) {
				const { node, signature } = steps[i]
				const previous = nodes.slice(0, i)
				const conditions =
					signature ?
						[this.inv(signature, { arg: keyExpr!, kind: "Allows" })]
					:	[]
				if (previous.some(returnsTransformErrors))
					conditions.push(`!(${isTransformErrors()})`)
				if (previous.some(node => node.tfCtx))
					conditions.push(`${this.ctx}.errN === ${errN}`)
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
		return this.if(this.cmpTfd(steps, name, "!==", input), () => {
			if (!checksErrors) return onChange()
			this.if(isTransformErrors(), () => this.addMorphErrs(name, keyExpr))
			return opts?.onChange ? this.else(onChange) : this
		})
	}

	/** writes adding the errors a morph returned */
	addMorphErrs(errors: string, keyExpr?: string): this {
		const key = keyExpr === undefined ? "" : `, ${keyExpr}`
		return this.line(
			this.needsCtx ?
				`${this.ref(addMorphErrs)}(${this.ctx}, ${errors}${key})`
			:	`failed = ${errors}.addTo(failed${key})`
		)
	}

	/** an expression comparing what steps transformed with their input */
	cmpTfd(
		steps: readonly TransformStep[],
		transformed: string,
		operator: "===" | "!==",
		input: string
	): string {
		const canChangeSignOfZero = steps.some(
			({ node }) =>
				node.isRoot() && node.branches.some(n => !n.is("intersection"))
		)
		return canChangeSignOfZero ?
				`${operator === "===" ? "" : "!"}Object.is(${transformed}, ${input})`
			:	`${transformed} ${operator} ${input}`
	}

	/** writes returning `data` if a morph added errors */
	retIfFailed(): this {
		if (!this.checksErrs) return this
		return this.needsCtx ?
				this.if("ctx.errN > errN", () => this.return("data"))
			:	this.if("failed", () => this.return("failed"))
	}

	// what a node's Allows holds for, as an expression
	condition(node: BaseNode): string {
		return node.compileCondition?.(this, this.data) ?? this.inv(node)
	}

	// Apply reports a failed condition at its site
	check(node: BaseNode, opts?: CheckOptions): this {
		const arg = opts?.arg ?? this.data
		const condition =
			opts?.kind || (this.trav === "Apply" && node.is("union")) ?
				undefined
			:	node.compileCondition?.(this, arg)
		const fail = () => (opts?.breaks ? this.line("break") : this.return(false))
		if (condition === undefined)
			return this.if(`!${this.inv(node, opts)}`, fail)
		return this.if(
			this.trav === "Allows" ?
				`!(${condition})`
			:	`!(${condition}) && ${this.error(node, undefined, arg)}`,
			fail
		)
	}

	checkLeaf(node: BaseNode): this {
		const condition = node.compileCondition!(this, this.data)!
		return this.return(
			this.trav === "Allows" ?
				condition
			:	`${condition} || !${this.error(node)}`
		)
	}

	// a traversal passed as a value rather than called
	traversal(node: BaseNode, kind: TraversalKind): string {
		return this.refToId(node.id, { kind })
	}
}

export const returnsTransformErrors = (node: BaseNode): boolean =>
	node.hasMorph && !node.tfCtx

const isPredicate = (node: BaseNode): boolean => node.is("predicate")

export const isDecidedByAllows = (node: BaseNode): boolean =>
	!node.hasMorph &&
	!node.allowsCtx &&
	!node.selectReferences(isPredicate).length

// a basis with one refinement
export const isRefinedBasis = (node: BaseNode): node is IntersectionNode =>
	node.is("intersection") &&
	node.basis !== null &&
	node.children.length === 2 &&
	node.preStruct.length === 1

// a pattern's verdict never changes, so Apply reuses Allows'
export const isRefinedPattern = (node: BaseNode): node is IntersectionNode =>
	isRefinedBasis(node) && node.preStruct[0].is("pattern")
