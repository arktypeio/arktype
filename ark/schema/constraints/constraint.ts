import { BaseNode, type Node, type NodeSubclass } from "../base.js"
import type { MutableInner } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	ConstraintKind,
	NodeKind,
	PrimitiveKind,
	kindRightOf
} from "../shared/implement.js"

export type FoldBranch<kind extends NodeKind> = Omit<
	MutableInner<"intersection">,
	kindRightOf<kind>
>

export class FoldState<kind extends NodeKind = "union"> {
	branches: FoldBranch<kind>[] = []
	disjoints: Disjoint[] = []

	map(fold: (branch: FoldBranch<kind>) => Disjoint | void): void {
		const nextBranches: FoldBranch<kind>[] = []
		for (const branch of this.branches) {
			const result = fold(branch)
			if (result instanceof Disjoint) {
				this.disjoints.push(result)
			} else {
				nextBranches.push(branch)
			}
		}
		this.branches = nextBranches
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
