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
import type { BasisKind, NodeKind, RefinementKind } from "../shared/define.js"

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

const cache = {} as PartialRecord<NodeKind, readonly TypeNode[]>

export type BaseRefinementDeclaration = extend<
	BaseNodeDeclaration,
	{ kind: RefinementKind }
>

export abstract class BaseRefinement<
		d extends BaseRefinementDeclaration,
		subclass extends NodeSubclass<d>
	>
	extends BaseNode<d["prerequisite"], d, subclass>
	implements PrimitiveNode
{
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string

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

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.kind as any, Object.assign(this.inner, { data }))
			ctx.currentErrors.add(this.expected)
		}
	}

	compileBody(ctx: CompilationContext) {
		return this.$.compilePrimitive(this as any, ctx)
	}
}
