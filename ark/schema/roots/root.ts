import type { satisfy } from "@arktype/util"
import { BaseNode, type NodeDefinition } from "../node.js"
import type { PredicateNodeDefinition } from "./predicate.js"

export type RootDefinitionsByKind = satisfy<
	Record<string, NodeDefinition>,
	{
		predicate: PredicateNodeDefinition
		// union: UnionNode
	}
>

export abstract class RootNode<
	def extends NodeDefinition = NodeDefinition
> extends BaseNode<def> {
	abstract references(): BaseNode[]
	abstract intersect(): RootNode
	abstract keyof(): BaseNode
}
