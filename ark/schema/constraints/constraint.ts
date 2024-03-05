import {
	BaseNode,
	type ConstraintNode,
	type Node,
	type NodeSubclass
} from "../base.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	BranchableNodeKind,
	ConstraintKind,
	kindLeftOf
} from "../shared/implement.js"

export type constraintKindLeftOf<kind extends ConstraintKind> = ConstraintKind &
	kindLeftOf<kind>

export type constraintKindOrLeftOf<kind extends ConstraintKind> =
	| kind
	| constraintKindLeftOf<kind>

export interface ConstraintInner<rule = unknown> extends BaseMeta {
	readonly rule: rule
}

export interface BaseConstraintDeclaration extends BaseNodeDeclaration {
	kind: ConstraintKind
}

type intersectConstraintKinds<
	l extends ConstraintKind,
	r extends ConstraintKind
> =
	| Node<l | r>
	| Disjoint
	| null
	// A constraint intersection may result in a union if both operands could be of the same BranchableNodeKind
	| (l & r & BranchableNodeKind extends never ? never : Node<l | r>[])

export abstract class BaseConstraint<
	d extends BaseConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<d["prerequisite"], d, subclass> {
	intersect<r extends ConstraintNode>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return this.intersectInternal(r) as never
	}

	get hasOpenIntersection() {
		return this.impl.hasOpenIntersection as d["hasOpenIntersection"]
	}
}

export abstract class BasePrimitiveConstraint<
	d extends BaseConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseConstraint<d, subclass> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly expectedContext: d["expectedContext"]

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.description)
		}
	}

	compile(js: NodeCompiler) {
		js.compilePrimitive(this as never)
	}
}
