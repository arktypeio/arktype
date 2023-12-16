import { throwParseError, type PartialRecord, type extend } from "@arktype/util"
import {
	BaseNode,
	type Node,
	type NodeSubclass,
	type TypeNode,
	type TypeSchema
} from "../base.js"
import type { CompilationContext, TraverseApply } from "../scope.js"
import type { BaseNodeDeclaration, PrimitiveNode } from "../shared/declare.js"
import type {
	BasisKind,
	NodeKind,
	PrimitiveRefinementKind,
	RefinementKind
} from "../shared/define.js"
import { isDotAccessible } from "../shared/registry.js"

export type NamedPropKind = "required" | "optional"

export const compilePropAccess = (name: string, optional = false) =>
	isDotAccessible(name)
		? `${optional ? "?" : ""}.${name}`
		: `${optional ? "?." : ""}[${JSON.stringify(name)}]`

export const compilePresentProp = (
	node: Node<NamedPropKind>,
	ctx: CompilationContext
) => {
	if (ctx.compilationKind === "allows") {
		return `return this.${node.value.id}(${ctx.argName}${compilePropAccess(
			node.compiledKey
		)})`
	}
	return `errors.currentPath.push(${node.serializedKey})
	this.${node.value.id}(${ctx.argName}${compilePropAccess(
		node.compiledKey
	)}, errors)
	errors.currentPath.pop()
	`
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

const cache = {} as PartialRecord<NodeKind, readonly TypeNode[]>

export type BaseRefinementDeclaration = extend<
	BaseNodeDeclaration,
	{
		kind: RefinementKind
	}
>

export abstract class BaseRefinement<
	d extends BaseNodeDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<any, d, subclass> {
	abstract getCheckedDefinitions(): readonly TypeSchema[]
	readonly checks: readonly TypeNode[] =
		cache[this.kind] ??
		(cache[this.kind] = this.getCheckedDefinitions().map((o) =>
			this.$.parseTypeNode(o)
		))

	assertValidBasis(basis: Node<BasisKind> | undefined) {
		if (this.checks.length === 1 && this.checks[0].isUnknown()) {
			return
		}
		if (!this.checks.some((o) => basis?.extends(o))) {
			throwParseError(
				`${this.kind} operand must be of type ${this.checks.join(
					" or "
				)} (was ${getBasisName(basis)})`
			)
		}
	}
}

export type BasePrimitiveRefinementDeclaration = extend<
	BaseRefinementDeclaration,
	{ kind: PrimitiveRefinementKind }
>

export abstract class BasePrimitiveRefinement<
		d extends BasePrimitiveRefinementDeclaration,
		subclass extends NodeSubclass<d>
	>
	extends BaseRefinement<d, subclass>
	implements PrimitiveNode
{
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.addError(this.kind as any, Object.assign(this.inner, { data }))
			ctx.errors.add(this.description)
		}
	}

	compileBody(ctx: CompilationContext) {
		return this.$.compilePrimitive(this as any, ctx)
	}
}
