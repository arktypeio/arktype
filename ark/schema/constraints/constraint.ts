import type { listable } from "@arktype/util"
import {
	BaseNode,
	type ConstraintNode,
	type Node,
	type NodeSubclass
} from "../base.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	ConstraintKind,
	kindLeftOf
} from "../shared/implement.js"

export type constraintKindLeftOf<kind extends ConstraintKind> = ConstraintKind &
	kindLeftOf<kind>

export type constraintKindOrLeftOf<kind extends ConstraintKind> =
	| kind
	| constraintKindLeftOf<kind>

export interface BaseConstraintDeclaration extends BaseNodeDeclaration {
	kind: ConstraintKind
}

export abstract class BaseConstraint<
	d extends BaseConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<d["prerequisite"], d, subclass> {
	intersect<r extends ConstraintNode>(
		r: r
	): listable<Node<this["kind"] | r["kind"]>> | Disjoint | null {
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

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
