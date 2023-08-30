import { compose } from "@arktype/util"
import type {
	AbstractableConstructor,
	composeTraits,
	extend,
	intersectParameters,
	Trait,
	TraitConstructor,
	TraitDeclaration
} from "@arktype/util"
import type { ConstraintDefinitions } from "./traits/constraint.js"
import { Describable } from "./traits/description.js"
import type { TypeDefinitions } from "./types/type.js"

export type nodeConstructor<
	node extends Trait,
	base extends AbstractableConstructor<Trait>
> = (
	implementation: Parameters<
		TraitConstructor<
			new (
				abstracts: ConstructorParameters<base>[0] &
					Omit<node, keyof InstanceType<base>>
			) => node
		>
	>[0]
) => (rule: node["args"][0], attributes?: node["args"][1]) => node

export type NodeDefinitionsByKind = extend<
	TypeDefinitions,
	ConstraintDefinitions
>

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

export const composeNode = <traits extends readonly TraitDeclaration[]>(
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
