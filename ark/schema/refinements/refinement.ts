import type { mutable } from "@arktype/util"
import { BaseNode, type Node, type NodeSubclass } from "../base.js"
import type { AllowsCompiler, ApplyCompiler } from "../shared/compile.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	NodeKind,
	PrimitiveKind,
	RefinementKind,
	TraversableNode,
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

export type FoldOutput<kind extends NodeKind> = FoldInput<kind> | Disjoint

export interface BasePrimitiveRefinementDeclaration
	extends BaseNodeDeclaration {
	kind: PrimitiveKind & RefinementKind
}

export abstract class BasePrimitiveRefinement<
		d extends BasePrimitiveRefinementDeclaration,
		subclass extends NodeSubclass<d>
	>
	extends BaseNode<d["prerequisite"], d, subclass>
	implements TraversableNode<d["prerequisite"]>
{
	abstract foldIntersection(into: FoldInput<d["kind"]>): FoldOutput<d["kind"]>

	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly expectedContext: d["expectedContext"]

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.description)
		}
	}

	compileApply(js: ApplyCompiler) {
		js.compilePrimitive(this as never)
	}

	compileAllows(js: AllowsCompiler) {
		js.compilePrimitive(this as never)
	}
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
