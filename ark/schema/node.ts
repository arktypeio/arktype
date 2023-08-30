import type {
	AbstractableConstructor,
	extend,
	TraitConstructor
} from "@arktype/util"
import { Trait } from "@arktype/util"
import type { ConstraintDefinitions } from "./traits/constraint.js"
import type { RootDefinitions } from "./types/type.js"

export type nodeConstructor<
	node extends Trait,
	base extends AbstractableConstructor<BaseNode>
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
	RootDefinitions,
	ConstraintDefinitions
>

export type NodesByKind = {
	[k in NodeKind]: NodeDefinitionsByKind[k]
}

export type NodeKind = keyof NodeDefinitionsByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export abstract class BaseNode<abstracts extends {} = {}> extends Trait<
	{ kind: NodeKind } & abstracts
> {
	declare readonly id: string
	declare allows: (data: unknown) => boolean

	get rule() {
		return this.args[0] as (typeof this)["args"][0]
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	equals(other: BaseNode) {
		return this.id === other.id
	}
}
