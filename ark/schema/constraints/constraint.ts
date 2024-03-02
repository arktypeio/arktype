import type { lastOf } from "@arktype/util"
import {
	BaseNode,
	type Node,
	type NodeSubclass,
	type UnknownNode
} from "../base.js"
import type { MutableInner } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	ConstraintKind,
	NodeKind,
	OrderedNodeKinds,
	PrimitiveKind,
	kindRightOf
} from "../shared/implement.js"

export type FoldBranch<kind extends NodeKind = lastOf<OrderedNodeKinds>> = Omit<
	MutableInner<"intersection">,
	kindRightOf<kind>
>

export type FoldMappableNode<kind extends NodeKind> = Node & {
	fold: (branch: FoldBranch<kind>) => Disjoint | void
}

export class FoldState<kind extends NodeKind = lastOf<OrderedNodeKinds>> {
	branches: FoldBranch<kind>[] = []

	map(node: FoldMappableNode<kind>): Disjoint | void {
		const nextBranches: FoldBranch<kind>[] = []
		const disjoints: Disjoint[] = []
		for (const branch of this.branches) {
			const result = node.fold(branch)
			if (result instanceof Disjoint) {
				disjoints.push(result)
			} else {
				nextBranches.push(branch)
			}
		}
		this.branches = nextBranches
		return nextBranches.length
			? undefined
			: disjoints.length === 1
			? disjoints[0]
			: Disjoint.from("union", [node], this.branches)
	}
}

export interface BasePrimitiveConstraintDeclaration
	extends BaseNodeDeclaration {
	kind: PrimitiveKind & ConstraintKind
}

export abstract class BasePrimitiveConstraint<
	d extends BasePrimitiveConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<d["prerequisite"], d, subclass> {
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
