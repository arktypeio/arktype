import type { and } from "@arktype/util"
import { BaseNode, type NodeSubclass, type TypeSchema } from "../base.js"
import type { ExpectedContext } from "../kinds.js"
import {
	compilePrimitive,
	createPrimitiveExpectedContext,
	type CompilationContext
} from "../shared/compile.js"
import type {
	BaseConstraint,
	BaseNodeDeclaration,
	BasePrimitive,
	FoldInput,
	FoldOutput
} from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import {
	createBasisAssertion,
	type ConstraintGroupName,
	type RefinementKind
} from "../shared/implement.js"
import type { TraverseApply } from "../traversal/context.js"

export type BaseRefinementDeclaration = and<
	BaseNodeDeclaration,
	{ kind: RefinementKind }
>

export abstract class BaseRefinement<
		d extends BaseRefinementDeclaration,
		subclass extends NodeSubclass<d>
	>
	extends BaseNode<d["prerequisite"], d, subclass>
	implements BasePrimitive, BaseConstraint<d["kind"]>
{
	abstract foldIntersection(into: FoldInput<d["kind"]>): FoldOutput<d["kind"]>

	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly constraintGroup: ConstraintGroupName
	abstract get prerequisiteSchemas(): readonly TypeSchema[]

	private expectedContextCache?: ExpectedContext<d["kind"]>
	get expectedContext(): ExpectedContext<d["kind"]> {
		this.expectedContextCache ??= createPrimitiveExpectedContext(this as never)
		return this.expectedContextCache
	}

	assertValidBasis = createBasisAssertion(this as never)

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.expectedContext)
		}
	}

	compileApply(ctx: CompilationContext) {
		return compilePrimitive("apply", this as never, ctx)
	}

	compileAllows(ctx: CompilationContext) {
		return compilePrimitive("allows", this as never, ctx)
	}
}
