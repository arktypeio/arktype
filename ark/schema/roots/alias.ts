import {
	domainDescriptions,
	printable,
	throwInternalError,
	throwParseError,
	type array,
	type join
} from "@ark/util"
import { nodesByRegisteredId, type NodeId } from "../parse.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import {
	aliasVisits,
	maxAliasDepth,
	maxAliasVisits,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "../shared/traversal.ts"
import { $ark } from "../shared/registry.ts"
import {
	assertUnchecked,
	hasArkKind,
	inProgress,
	isIoFinal,
	isResolutionFinal
} from "../shared/utils.ts"
import { BaseRoot } from "./root.ts"

export declare namespace Alias {
	export type Schema<alias extends string = string> =
		| `$${alias}`
		| NormalizedSchema<alias>

	export interface NormalizedSchema<alias extends string = string>
		extends BaseNormalizedSchema {
		readonly reference: alias
		readonly resolve?: () => BaseRoot
		readonly operator?: string
		readonly operands?: readonly BaseRoot[]
	}

	export interface Inner<alias extends string = string> {
		readonly reference: alias
		readonly resolve?: () => BaseRoot
		readonly operator?: string
		readonly operands?: readonly BaseRoot[]
	}

	export interface Declaration
		extends declareNode<{
			kind: "alias"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
		}> {}

	export type Node = AliasNode
}

export const normalizeAliasSchema = (schema: Alias.Schema): Alias.Inner =>
	typeof schema === "string" ? { reference: schema } : schema

const implementation: nodeImplementationOf<Alias.Declaration> =
	implementNode<Alias.Declaration>({
		kind: "alias",
		hasAssociatedError: false,
		collapsibleKey: "reference",
		keys: {
			reference: {
				parse: reference => {
					const referenced = nodesByRegisteredId[reference as NodeId]
					if (hasArkKind(referenced, "context"))
						referenced.isReferencedById = true
					return reference
				},
				serialize: s => {
					const referenced = nodesByRegisteredId[s as NodeId]
					if (hasArkKind(referenced, "root")) return referenced.json
					return s.startsWith("$") ? s : `$ark.${s}`
				}
			},
			resolve: {
				serialize: () => null
			},
			operator: {},
			operands: {
				child: false,
				serialize: () => null
			}
		},
		normalize: normalizeAliasSchema,
		finalizeInnerJson: json => ({ reference: json.reference }),
		defaults: {
			description: node => node.expression
		}
	})

export class AliasNode extends BaseRoot<Alias.Declaration> {
	readonly expression: string = expressionOf(this)
	readonly structure = undefined
	// a cycle passes an alias referencing its definition while it's parsed, so Allows bounds only those
	closesCycle = true
	private _resolution: BaseRoot | undefined
	private resolving = false

	get resolution(): BaseRoot {
		if (this._resolution) return this._resolution
		if (this.resolving) {
			const names = resolvingAliases.map(aliasNameOf)
			const cycle = names.slice(names.lastIndexOf(aliasNameOf(this)))
			const start = cycle.indexOf([...cycle].sort()[0])
			const path = [...cycle.slice(start), ...cycle.slice(0, start)]
			return throwParseError(writeShallowCycleErrorMessage(path[0], path))
		}
		const isFinal = isResolutionFinal()
		const readsIo =
			isIoFinal() &&
			(this.isIo ||
				hasArkKind(nodesByRegisteredId[this.reference as NodeId], "root"))
		this.resolving = true
		resolvingAliases.push(this)
		inProgress.resolutions++
		if (readsIo) inProgress.ioReads++
		let resolution: BaseRoot
		try {
			resolution = this._resolve()
			if (resolution.hasKind("alias")) resolution = resolution.resolution
			if (this.resolve ? isFinal : this.$.resolved)
				this._resolution = resolution
		} finally {
			this.resolving = false
			resolvingAliases.pop()
			inProgress.resolutions--
			if (readsIo) inProgress.ioReads--
		}
		assertUnchecked()
		return resolution
	}

	protected _resolve(): BaseRoot {
		if (this.resolve) return this.resolve()
		if (this.reference[0] === "$")
			return this.$.resolveRoot(this.reference.slice(1))

		const id = this.reference as NodeId

		let resolution = nodesByRegisteredId[id]
		if (hasArkKind(resolution, "context") && resolution.alias) {
			return resolution.phase === "member" ?
					resolution.resolution!
				:	resolution.$.resolveRoot(resolution.alias)
		}
		const seen: NodeId[] = []
		while (hasArkKind(resolution, "context")) {
			if (seen.includes(resolution.id)) {
				return throwParseError(
					writeShallowCycleErrorMessage(resolution.id, seen)
				)
			}

			seen.push(resolution.id)
			resolution = nodesByRegisteredId[resolution.id]
		}
		if (!hasArkKind(resolution, "root")) {
			return throwInternalError(`Unexpected resolution for reference ${this.reference}
Seen: [${seen.join("->")}] 
Resolution: ${printable(resolution)}`)
		}
		return resolveShallowAliases(resolution)
	}

	get isIo(): boolean {
		return this.operator === "In" || this.operator === "Out"
	}

	get resolutionId(): NodeId {
		if (this.resolve) return this.resolution.id
		if (this.reference[0] !== "$") return this.reference as NodeId
		const alias = this.reference.slice(1)
		const resolution = this.$.resolutions[alias]
		if (typeof resolution === "string") return resolution
		if (hasArkKind(resolution, "root")) return resolution.id

		return throwInternalError(
			`Unexpected resolution for reference ${this.reference}: ${printable(resolution)}`
		)
	}

	get defaultShortDescription(): string {
		return isResolutionFinal() ?
				this.resolution.defaultShortDescription
			:	domainDescriptions.object
	}

	override getIo(ioKind: "in" | "out"): BaseRoot {
		if (!isIoFinal() || !this.transforms) return this
		const operator = ioKind === "in" ? "In" : "Out"
		return this.$.lazilyResolve(
			() => {
				const ioOf = (alias: AliasNode) =>
					ioKind === "in" ? alias.resolution.rawIn : alias.resolution.rawOut
				const aliases: AliasNode[] = [this]
				let io = ioOf(this)
				while (io.hasKind("alias") && io.operator === operator) {
					const aliased = io.operands![0] as AliasNode
					if (aliases.includes(aliased)) return $ark.intrinsic.never.internal
					aliases.push(aliased)
					io = ioOf(aliased)
				}
				return io
			},
			`${operator}<${identityOf(this)}>`,
			operator,
			[this]
		)
	}

	get nestableExpression(): string {
		const referenced = nodesByRegisteredId[this.reference as NodeId]
		return hasArkKind(referenced, "root") ?
				referenced.nestableExpression
			:	this.expression
	}

	traverseAllows: TraverseAllows = (data, ctx) => {
		if (!this.closesCycle) return this.resolution.traverseAllows(data, ctx)
		if (typeof ctx === "number") {
			return ctx < maxAliasDepth && ++aliasVisits.count <= maxAliasVisits ?
					this.resolution.traverseAllows(data, (ctx + 1) as never)
				:	aliasVisits.exceed()
		}
		return (
			ctx.enterResolution(this.resolution.id, data) ??
			ctx.exitResolution(this.resolution.traverseAllows(data, ctx))
		)
	}

	traverseApply: TraverseApply = (data, ctx) => {
		const resolution = this.resolution
		if (
			ctx.enterResolution(resolution.id, data, resolution.traverseApply) !==
			undefined
		)
			return
		resolution.traverseApply(data, ctx)
		ctx.exitResolution()
	}

	traverseTransform: TraverseTransform = (data, ctx) =>
		ctx.transformResolution(
			this.resolution.id,
			data,
			this.resolution.traverseTransform
		)

	compile(js: NodeCompiler): void {
		const resolution = this.resolution
		const traverse = js.invoke(resolution)
		const id = resolution.id
		if (js.traversalKind === "Transform") {
			js.return(
				`ctx.transformResolution("${id}", data, ${js.referenceToId(id, { kind: "Transform" })})`
			)
			return
		}
		if (js.traversalKind === "Apply") {
			const apply = js.referenceToId(id, { kind: "Apply" })
			js.if(`ctx.enterResolution("${id}", data, ${apply}) === undefined`, () =>
				js.line(traverse).line("ctx.exitResolution()")
			)
			return
		}
		if (!this.closesCycle) {
			js.return(traverse)
			return
		}
		const allows = js.referenceToId(id, { kind: "Allows" })
		const visits = js.ref(aliasVisits)
		js.if(`typeof ctx === "number"`, () =>
			js.return(
				`ctx < ${maxAliasDepth} && ++${visits}.count <= ${maxAliasVisits} ? ${allows}(data, ctx + 1) : ${visits}.exceed()`
			)
		)
		js.const("reached", `ctx.enterResolution("${id}", data)`)
		js.if("reached !== undefined", () => js.return("reached"))
		js.return(`ctx.exitResolution(${traverse})`)
	}
}

const expressionOf = (node: AliasNode): string => {
	if (node.operands) {
		const joinsOperands = node.operator === "&" || node.operator === "=>"
		const operands = node.operands.map(operand =>
			!joinsOperands && nestsOperations(operand) ? "..." : operand.expression
		)
		return joinsOperands ?
				operands.join(node.operator)
			:	`${node.operator}<${operands.join(", ")}>`
	}
	const referenced = nodesByRegisteredId[node.reference as NodeId]
	if (hasArkKind(referenced, "root")) return referenced.expression
	return hasArkKind(referenced, "context") && referenced.alias ?
			`$${referenced.alias}`
		:	node.reference
}

// a deferred value prints as its definition, so it holds the operations its definition does
const operationsOf = (node: BaseRoot, seen: BaseRoot[] = []): AliasNode[] => {
	if (!node.includesAlias || seen.includes(node)) return []
	seen.push(node)
	const operations: AliasNode[] = []
	for (const reference of node.references) {
		if (!reference.hasKind("alias")) continue
		if (reference.operands) operations.push(reference)
		else {
			const referenced = nodesByRegisteredId[reference.reference as NodeId]
			if (hasArkKind(referenced, "root"))
				operations.push(...operationsOf(referenced, seen))
		}
	}
	return operations
}

// an argument nesting operations is elided, since an expansive generic would repeat it at every level
const nestsOperations = (arg: BaseRoot): boolean =>
	operationsOf(arg).some(operation =>
		operation.operands!.some(operand => operationsOf(operand).length !== 0)
	)

const aliasNameOf = (node: AliasNode): string =>
	node.expression[0] === "$" ? node.expression.slice(1) : node.expression

const resolvingAliases: AliasNode[] = []

export const resolveShallowAliases = (node: BaseRoot): BaseRoot => {
	if (!node.includesShallowAlias) return node
	if (node.hasKind("alias")) return node.resolution
	if (node.hasKind("union")) {
		return node.$.node("union", {
			...node.inner,
			branches: node.branches.map(resolveShallowAliases),
			meta: node.meta
		} as never)
	}
	if (node.hasKind("morph")) {
		return node.$.node("morph", {
			...node.inner,
			in: node.inner.in && resolveShallowAliases(node.inner.in),
			meta: node.meta
		} as never)
	}
	return throwInternalError(
		`Unexpected shallow alias in ${node.kind} node ${node.expression}`
	)
}

export const identityOf = (node: BaseRoot): string =>
	node.hasKind("alias") && !node.operands ? node.reference : node.id

export const isResolvable = (node: BaseRoot): boolean => {
	if (!node.includesShallowAlias) return true
	if (node.hasKind("union")) return node.branches.every(isResolvable)
	if (node.hasKind("morph"))
		return !node.inner.in || isResolvable(node.inner.in)
	if (!node.hasKind("alias") || resolvingAliases.includes(node)) return false
	if (node.isIo) return isResolvable(node.operands![0])
	const referenced = nodesByRegisteredId[node.reference as NodeId]
	return hasArkKind(referenced, "root") && isResolvable(referenced)
}

export const writeShallowCycleErrorMessage = <
	name extends string,
	seen extends array<string>
>(
	name: name,
	seen: seen
): writeShallowCycleErrorMessage<name, seen> =>
	`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join("->")}` as never

export type writeShallowCycleErrorMessage<
	name extends string,
	seen extends array<string>
> = `Alias '${name}' has a shallow resolution cycle: ${join<[...seen, name], "->">}`

export const Alias = {
	implementation,
	Node: AliasNode
}
