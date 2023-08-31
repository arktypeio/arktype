import type {
	AbstractableConstructor,
	extend,
	TraitConstructor
} from "@arktype/util"
import { implement, Trait } from "@arktype/util"
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
) => (rule: Parameters<node["init"]>[0], attributes?: node["args"][1]) => node

export type NodeDefinitionsByKind = extend<
	RootDefinitions,
	ConstraintDefinitions
>

export type NodesByKind = {
	[k in NodeKind]: NodeDefinitionsByKind[k]
}

export type NodeKind = keyof NodeDefinitionsByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export abstract class Kinded extends Trait<{ kind: NodeKind }> {
	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}
}

const z = implement(Kinded)({ kind: "bound" })

export abstract class Fingerprinted extends Trait<{ hash(): string }> {
	// TOOD: figure out caching
	get id() {
		return this.hash()
	}

	equals(other: Fingerprinted) {
		return this.id === other.id
	}
}

export abstract class Enforceable<rule = unknown> extends Trait<
	{},
	{ rule: rule }
> {
	init(rule: rule) {
		return { rule }
	}
}
