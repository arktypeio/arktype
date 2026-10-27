import {
	domainDescriptions,
	printable,
	throwInternalError,
	throwParseError,
	type array,
	type join
} from "@ark/util"
import { ioOf, writeInnerJson, type BaseNode } from "../node.ts"
import { nodesById, type NodeId } from "../parse.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import {
	aliasVisits,
	applyResolution,
	enterResolution,
	exitResolution,
	maxAliasDepth,
	maxAliasVisits,
	transformResolution,
	type AliasDepth,
	type InternalTraversal
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
	export interface Inner<alias extends string = string> {
		readonly reference: alias
		readonly resolve?: () => BaseRoot
		readonly operator?: string
		readonly operands?: readonly BaseRoot[]
	}

	export interface Declaration
		extends declareNode<{
			kind: "alias"
			inner: Inner
		}> {}

	export type Node = AliasNode
}

const implementation: nodeImplementationOf<Alias.Declaration> =
	implementNode<Alias.Declaration>({
		kind: "alias",
		ownErr: false,
		bareKey: "reference",
		keys: {
			reference: {
				serialize: s => {
					const referenced = nodesById[s as NodeId]
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
		finalizeInnerJson: json => ({ reference: json.reference }),
		defaults: {
			description: node => node.expression
		}
	})

export class AliasNode extends BaseRoot<Alias.Declaration> {
	readonly expression: string

	constructor(...args: ConstructorParameters<typeof BaseRoot>) {
		super(...args)
		// written now, so a later resolution stays a reference
		this.cache.innerJsonFull = writeInnerJson(this)
		this.expression = expressionOf(this)
		const referenced = nodesById[this.reference as NodeId]
		if (hasArkKind(referenced, "context")) {
			referenced.isReferencedById = true
			if (!referenced.alias && !this.operator)
				referenced.isReferencedAsThis = true
		}
	}
	readonly structure = undefined
	// a cycle passes an alias referencing its definition while it's parsed, so
	// Allows bounds only those
	closesCycle = true
	private _resolution: BaseRoot | undefined

	get resolution(): BaseRoot {
		if (this._resolution) return this._resolution
		if (resolvingAliases.includes(this)) {
			const names = resolvingAliases.map(aliasNameOf)
			const cycle = names.slice(names.lastIndexOf(aliasNameOf(this)))
			const start = cycle.indexOf([...cycle].sort()[0])
			const path = [...cycle.slice(start), ...cycle.slice(0, start)]
			return throwParseError(writeShallowCycleErrorMessage(path[0], path))
		}
		const isFinal = isResolutionFinal()
		const readsIo =
			isIoFinal() &&
			(this.isIo || hasArkKind(nodesById[this.reference as NodeId], "root"))
		resolvingAliases.push(this)
		inProgress.resolutions++
		if (readsIo) inProgress.ioReads++
		let resolution: BaseRoot
		try {
			resolution = this._resolve()
			if (resolution.is("alias")) resolution = resolution.resolution
			if (this.resolve) resolution.cache.isAliasResolution = true
			if (this.resolve ? isFinal : this.$.resolved)
				this._resolution = resolution
		} finally {
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

		let resolution = nodesById[id]
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
			resolution = nodesById[resolution.id]
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

	get hasResolvableOperands(): boolean {
		return this.operands!.every(isResolvable)
	}

	operandsBesides(node: BaseNode): BaseRoot[] | undefined {
		if (this.operator !== "&") return
		const others = this.operands!.filter(
			operand => identityOf(operand) !== identityOf(node)
		)
		return others.length < this.operands!.length ? others : undefined
	}

	get brief(): string {
		return isResolutionFinal() ?
				this.resolution.brief
			:	domainDescriptions.object
	}

	override getIo(ioKind: "in" | "out"): BaseRoot {
		if (!isIoFinal() || !this.transforms) return this
		const operator = ioKind === "in" ? "In" : "Out"
		return this.$.lazilyResolve(
			() => {
				const aliases: AliasNode[] = [this]
				let io = ioOf(this.resolution, ioKind)
				while (io.is("alias") && io.operator === operator) {
					const aliased = io.operands![0] as AliasNode
					if (aliases.includes(aliased)) return $ark.intrinsic.never.internal
					aliases.push(aliased)
					io = ioOf(aliased.resolution, ioKind)
				}
				return io
			},
			`${operator}<${identityOf(this)}>`,
			operator,
			[this]
		)
	}

	get nestedExpr(): string {
		if (this.operator === "&" || this.operator === "=>")
			return `(${this.expression})`
		const referenced = nodesById[this.reference as NodeId]
		return (
				hasArkKind(referenced, "root") &&
					referenced.expression === this.expression
			) ?
				referenced.nestedExpr
			:	this.expression
	}

	traverseAllows(data: unknown, ctx: InternalTraversal | AliasDepth): boolean {
		if (!this.closesCycle) return this.resolution.traverseAllows(data, ctx)
		if (typeof ctx === "number") {
			if (ctx < maxAliasDepth && ++aliasVisits.count <= maxAliasVisits)
				return this.resolution.traverseAllows(data, ctx + 1)
			const tracked = aliasVisits.exceed(data)
			if (!tracked) return false
			ctx = tracked
		}
		return (
			enterResolution(ctx, this.resolution.id, data) ??
			exitResolution(ctx, this.resolution.traverseAllows(data, ctx))
		)
	}

	traverseApply(data: unknown, ctx: InternalTraversal): void {
		const resolution = this.resolution
		applyResolution(resolution.id, resolution, data, ctx)
	}

	traverseTransform(data: unknown, ctx: InternalTraversal): unknown {
		return transformResolution(
			ctx,
			this.resolution.id,
			data,
			this.resolution.traverseTransform!,
			this.resolution
		)
	}

	compile(js: NodeCompiler): void {
		const resolution = this.resolution
		const id = resolution.id
		if (js.trav === "Transform") {
			js.return(
				`${js.ref(transformResolution)}(ctx, "${js.nameOf(id)}", data, ${js.refToId(id, { kind: "Transform" })})`
			)
			return
		}
		if (js.trav === "Apply") {
			js.return(js.resolution(resolution, id))
			return
		}
		const traverse = js.inv(resolution)
		if (!this.closesCycle) {
			js.return(traverse)
			return
		}
		const allows = js.refToId(id, { kind: "Allows" })
		const visits = js.ref(aliasVisits)
		js.if(`typeof ctx === "number"`, () =>
			js
				.if(
					`ctx < ${maxAliasDepth} && ++${visits}.count <= ${maxAliasVisits}`,
					() => js.return(`${allows}(data, ctx + 1)`)
				)
				.set("ctx", `${visits}.exceed(data)`)
				.if("!ctx", () => js.return("false"))
		)
		js.return(
			`${js.ref(enterResolution)}(ctx, "${js.nameOf(id)}", data) ?? ${js.ref(exitResolution)}(ctx, ${traverse})`
		)
	}
}

const expressionOf = (node: AliasNode): string => {
	if (node.operands) {
		const joinsOperands = node.operator === "&" || node.operator === "=>"
		const operands = node.operands.map(operand =>
			joinsOperands ? operand.nestedExpr
			: nestsOperations(operand) ? "..."
			: operand.expression
		)
		return joinsOperands ?
				operands.join(node.operator)
			:	`${node.operator}<${operands.join(", ")}>`
	}
	const referenced = nodesById[node.reference as NodeId]
	if (hasArkKind(referenced, "root")) return referenced.expression
	if (!hasArkKind(referenced, "context")) return node.reference
	return referenced.alias ? `$${referenced.alias}` : (referenced.name ?? "this")
}

const operationsOf = (node: BaseRoot, seen: BaseRoot[] = []): AliasNode[] => {
	if (!node.hasAlias || seen.includes(node)) return []
	seen.push(node)
	const operations: AliasNode[] = []
	for (const reference of node.references) {
		if (!reference.is("alias")) continue
		if (reference.operands) operations.push(reference)
		else {
			const referenced = nodesById[reference.reference as NodeId]
			if (hasArkKind(referenced, "root"))
				operations.push(...operationsOf(referenced, seen))
		}
	}
	return operations
}

const nestsOperations = (arg: BaseRoot): boolean =>
	operationsOf(arg).some(operation =>
		operation.operands!.some(operand => operationsOf(operand).length !== 0)
	)

const aliasNameOf = (node: AliasNode): string =>
	node.expression[0] === "$" ? node.expression.slice(1) : node.expression

const resolvingAliases: AliasNode[] = []

export const resolveShallowAliases = (node: BaseRoot): BaseRoot => {
	if (!node.topAlias) return node
	if (node.is("alias")) return node.resolution
	if (node.is("union")) {
		return node.$.node("union", {
			...node.inner,
			branches: node.branches.map(resolveShallowAliases),
			meta: node.meta
		} as never)
	}
	if (node.is("morph")) {
		return node.$.node("morph", {
			...node.inner,
			morphs:
				node.head ?
					[resolveShallowAliases(node.head), ...node.piped]
				:	node.morphs,
			meta: node.meta
		} as never)
	}
	return throwInternalError(
		`Unexpected shallow alias in ${node.kind} node ${node.expression}`
	)
}

export const identityOf = (node: BaseNode): string =>
	node.is("alias") ? node.reference : node.id

export const isResolvable = (node: BaseRoot): boolean => {
	if (!node.topAlias) return true
	if (node.is("union")) return node.branches.every(isResolvable)
	if (node.is("morph")) return !node.head || isResolvable(node.head)
	if (!node.is("alias") || resolvingAliases.includes(node)) return false
	if (node.isIo) return isResolvable(node.operands![0])
	// a transform's alias resolves to what it transformed once the transform returns
	if (node.resolve && !node.operator) return isResolutionFinal()
	const referenced = nodesById[node.reference as NodeId]
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
	impl: implementation,
	Node: AliasNode
}
