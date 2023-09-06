import type { NodeSubclass } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import type { BaseSchema } from "../schema.js"
import { BaseNode } from "../schema.js"
import { inferred } from "../utils.js"
import { PredicateNode } from "./predicate.js"
import { intersectBranches, UnionNode } from "./union.js"

export type RootsByKind = {
	predicate: PredicateNode
	union: UnionNode
}

export type RootKind = keyof RootsByKind

export abstract class TypeNode<
	t = unknown,
	schema extends BaseSchema = BaseSchema,
	node extends NodeSubclass<node> = NodeSubclass<any>
> extends BaseNode<schema, node> {
	declare infer: t;
	declare [inferred]: t
	declare branches: readonly PredicateNode[]

	abstract references(): readonly TypeNode[]

	abstract keyof(): TypeNode

	allows(data: unknown) {
		return true
	}

	intersect<other extends TypeNode>(
		other: other // TODO: inferIntersection
	):
		| ([this, other] extends [PredicateNode, PredicateNode]
				? PredicateNode<this["infer"] & other["infer"]>
				: TypeNode<this["infer"] & other["infer"]>)
		| Disjoint
	intersect(
		other: TypeNode // TODO: inferIntersection
	): TypeNode | Disjoint {
		const resultBranches = intersectBranches(this.branches, other.branches)
		return resultBranches.length === 0
			? Disjoint.from("union", this.branches, other.branches)
			: resultBranches.length === 1
			? resultBranches[0]
			: new UnionNode({ branches: resultBranches })
	}

	isUnknown(): this is PredicateNode<unknown> {
		return this.hasKind("predicate") && this.constraints.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	array(): PredicateNode<t[]> {
		return new PredicateNode({ constraints: [] })
	}

	extends<other>(other: TypeNode<other>): this is TypeNode<other> {
		return true
		// const intersection = this.intersect(other)
		// return !(intersection instanceof Disjoint) && this.equals(intersection)
	}
}
