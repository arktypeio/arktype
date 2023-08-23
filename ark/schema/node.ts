import { compose } from "@arktype/util"
import type { composeTraits, extend, Trait } from "@arktype/util"
import { Describable } from "./traits/description.js"
import type { RuleDefinitions } from "./traits/trait.js"
import type { TypeDefinitions } from "./types/type.js"

export type NodeDefinitionsByKind = extend<TypeDefinitions, RuleDefinitions>

export type NodesByKind = {
	[k in NodeKind]: InstanceType<NodeDefinitionsByKind[k]>
}

export type NodeKind = keyof NodeDefinitionsByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export abstract class BaseNode {
	declare readonly id: string
	declare allows: (data: unknown) => boolean

	abstract readonly kind: NodeKind

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	equals(other: BaseNode) {
		return this.id === other.id
	}
}

export const composeNode = <traits extends readonly Trait[]>(
	...traits: traits
) => {
	abstract class BaseNode extends compose(Describable, ...traits) {
		declare readonly id: string
		declare allows: (data: unknown) => boolean

		abstract readonly kind: NodeKind

		hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
			return this.kind === (kind as never)
		}

		equals(other: BaseNode) {
			return this.id === other.id
		}
	}
	return BaseNode as {} as composeTraits<
		[typeof Describable, ...traits],
		[],
		typeof BaseNode
	>
}
