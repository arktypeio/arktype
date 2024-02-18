import type { mutable } from "@arktype/util"
import { BaseNode, type Node, type NodeSubclass } from "../base.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	ConstraintKind,
	NodeKind,
	PrimitiveKind,
	kindRightOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import type { IntersectionInner } from "../types/intersection.js"

export type FoldInput<kind extends NodeKind> = {
	-readonly [k in Exclude<
		keyof IntersectionInner,
		kindRightOf<kind>
	>]?: IntersectionInner[k] extends readonly unknown[] | undefined
		? mutable<IntersectionInner[k]>
		: IntersectionInner[k]
}

export interface BasePrimitiveConstraintDeclaration
	extends BaseNodeDeclaration {
	kind: PrimitiveKind & ConstraintKind
}

export interface BaseConstraint<kind extends ConstraintKind> {
	foldIntersection(into: FoldInput<kind>): Disjoint | undefined
}

export abstract class BasePrimitiveConstraint<
		d extends BasePrimitiveConstraintDeclaration,
		subclass extends NodeSubclass<d>
	>
	extends BaseNode<d["prerequisite"], d, subclass>
	implements BaseConstraint<d["kind"]>
{
	abstract foldIntersection(into: FoldInput<d["kind"]>): Disjoint | undefined

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
