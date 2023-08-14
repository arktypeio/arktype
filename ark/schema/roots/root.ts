import type { satisfy } from "@arktype/util"
import { DomainConstraint } from "../constraints/domain.js"
import type { Disjoint } from "../disjoint.js"
import { BaseNode, type NodeDefinition } from "../node.js"
import { PredicateNode, type PredicateNodeDefinition } from "./predicate.js"

export type RootDefinitionsByKind = satisfy<
	Record<string, NodeDefinition>,
	{
		predicate: PredicateNodeDefinition
		union: PredicateNodeDefinition
	}
>

export type RootKind = keyof RootDefinitionsByKind

export abstract class RootNode<
	def extends NodeDefinition = NodeDefinition
> extends BaseNode<def> {
	abstract references(): BaseNode[]
	abstract intersect(other: RootNode): RootNode | Disjoint
	abstract keyof(): BaseNode

	isUnknown() {
		return this.hasKind("predicate") && this.rule.length === 0
	}

	isNever() {
		return this.hasKind("union") && this.rule.length === 0
	}

	array() {
		return new PredicateNode([new DomainConstraint("object")])
	}
}
