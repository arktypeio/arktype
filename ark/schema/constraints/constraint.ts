import { BaseNode, type Node, type NodeSubclass } from "../base.js"
import type { MutableInner } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	ConstraintKind,
	PrimitiveKind
} from "../shared/implement.js"
import { makeRootAndArrayPropertiesMutable } from "../shared/utils.js"
import type { UnionNode } from "../types/union.js"

export class IntersectionState extends Array<MutableInner<"intersection">> {
	private disjoints: Record<number, Disjoint> = {}

	prune() {
		for (const i in this.disjoints) {
			this.splice(+i, 1)
		}
		if (this.length === 0) {
			return Object.values(this.disjoints)
		}
		this.disjoints = {}
	}

	branch(union: UnionNode) {
		const temp =
			this.length === 1
				? union.$.parse("intersection", this[0])
				: union.$.parse("union", this)
		this.length = 0
		const intersection = union.intersect(temp)
		if (intersection instanceof Disjoint) {
			return intersection
		}
		this.push(
			...intersection.branches.map((branch) =>
				makeRootAndArrayPropertiesMutable(branch)
			)
		)
	}

	disjoint(
		index: number,
		...args: Parameters<(typeof Disjoint)["from"]> | [instance: Disjoint]
	) {
		// TODO: multiple disjoints with the same index
		this.disjoints[index] = args.length === 1 ? args[0] : Disjoint.from(...args)
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

	// TODO: allow nodes to register for lower precedence nodes they're interested in
	// TODO: can reuse at top-level?
	protected abstract foldIntersection(s: IntersectionState): void

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
