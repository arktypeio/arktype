import { DomainConstraint } from "../constraints/domain.js"
import type { Disjoint } from "../disjoint.js"
import type { BaseRule } from "../node.js"
import { BaseNode } from "../node.js"
import { PredicateNode } from "./predicate.js"
import type { UnionNode } from "./union.js"

export type TypesByKind = {
	predicate: PredicateNode
	union: UnionNode
}

export type TypeKind = keyof TypesByKind

// TODO: test external types if this isn't any
export type RootNode<t = any> = UnionNode<t> | PredicateNode<t>

export abstract class TypeNodeBase<
	t = unknown,
	rule extends BaseRule = BaseRule
> extends BaseNode<rule> {
	declare infer: t

	abstract references(): BaseNode[]
	abstract intersect<other>(
		other: RootNode<other> // TODO: inferIntersection
	): RootNode<t & other> | Disjoint
	abstract keyof(): RootNode

	isUnknown(): this is PredicateNode<unknown> {
		return this.hasKind("predicate") && this.rule.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.rule.length === 0
	}

	array() {
		return new PredicateNode([new DomainConstraint("object")])
	}

	extends<other>(other: RootNode<other>): this is RootNode<other> {
		const intersection = this.intersect(other)
		return intersection instanceof TypeNodeBase && this.equals(intersection)
	}
}
