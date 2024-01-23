import { throwParseError, type PartialRecord, type extend } from "@arktype/util"
import {
	BaseNode,
	type Node,
	type NodeSubclass,
	type TypeNode,
	type TypeSchema
} from "../base.js"
import type { ExpectedContext } from "../kinds.js"
import {
	compilePrimitive,
	createPrimitiveExpectedContext,
	type CompilationContext
} from "../shared/compile.js"
import type {
	BaseConstraint,
	BaseNodeDeclaration,
	BasePrimitive
} from "../shared/declare.js"
import type { BasisKind, NodeKind, RefinementKind } from "../shared/define.js"
import type {
	ConstraintGroupName,
	ConstraintKindsByGroup
} from "../shared/group.js"
import type { TraverseApply } from "../traversal/context.js"

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
	implements BasePrimitive, BaseConstraint
{
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly constraintGroup: ConstraintGroupName

	abstract getCheckedDefinitions(): readonly TypeSchema[]
	readonly checks: readonly TypeNode[] =
		cache[this.kind] ??
		(cache[this.kind] = this.getCheckedDefinitions().map((o) =>
			this.$.parseTypeNode(o)
		))

	private expectedContextCache?: ExpectedContext<d["kind"]>
	get expectedContext(): ExpectedContext<d["kind"]> {
		this.expectedContextCache ??= createPrimitiveExpectedContext(this as never)
		return this.expectedContextCache
	}

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
			ctx.error(this.expectedContext)
		}
	}

	compileBody(ctx: CompilationContext) {
		return compilePrimitive(this as any, ctx)
	}
}
