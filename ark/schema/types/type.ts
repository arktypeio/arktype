import { DomainConstraint } from "../rules/domain.js"
import type { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import { BaseNode } from "../node.js"
import { PredicateNode } from "./predicate.js"
import { UnionNode } from "./union.js"

export const typeDefinitions = {
	predicate: PredicateNode,
	union: UnionNode
}

export type TypeDefinitions = typeof typeDefinitions

export type TypeKind = keyof TypeDefinitions

// TODO: test external types if this isn't any
export type TypeNode<t = any> = UnionNode<t> | PredicateNode<t>

export abstract class TypeNodeBase<
	t = unknown,
	rule extends {} = {},
	attributes extends BaseAttributes = BaseAttributes
> extends BaseNode<rule, attributes> {
	declare infer: t

	abstract references(): readonly BaseNode[]
	abstract intersect<other>(
		other: TypeNode<other> // TODO: inferIntersection
	): TypeNode<t & other> | Disjoint
	abstract keyof(): TypeNode

	isUnknown(): this is PredicateNode<unknown> {
		return this.hasKind("predicate") && this.constraints.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	array() {
		return new PredicateNode([new DomainConstraint({ value: "object" })])
	}

	extends<other>(other: TypeNode<other>): this is TypeNode<other> {
		const intersection = this.intersect(other)
		return intersection instanceof TypeNodeBase && this.equals(intersection)
	}
}
