import type { satisfy } from "@arktype/util"
import { DomainConstraint } from "../constraints/domain.js"
import type { Disjoint } from "../disjoint.js"
import { BaseNode, type NodeDefinition } from "../node.js"
import { PredicateNode, type PredicateNodeDefinition } from "./predicate.js"
import type { UnionNode, UnionNodeDefinition } from "./union.js"

export type TypeNodeDefinitionsByKind = satisfy<
	Record<string, NodeDefinition>,
	{
		predicate: PredicateNodeDefinition
		union: UnionNodeDefinition
	}
>

export type TypeKind = keyof TypeNodeDefinitionsByKind

// TODO: test external types if this isn't any
export type RootNode<t = any> = UnionNode<t> | PredicateNode<t>

export abstract class TypeNode<
	t = unknown,
	def extends NodeDefinition = NodeDefinition
> extends BaseNode<def> {
	declare infer: t

	abstract references(): BaseNode[]
	abstract intersect<other>(
		other: RootNode<other> // TODO: inferIntersection
	): RootNode<t & other> | Disjoint
	abstract keyof(): TypeNode

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
		return intersection instanceof TypeNode && this.equals(intersection)
	}
}
