import type { extend } from "@arktype/util"
import type { ConstraintDefinitions } from "./traits/constraint.js"
import type { RootDefinitions } from "./types/type.js"

export type NodeDefinitionsByKind = extend<
	RootDefinitions,
	ConstraintDefinitions
>

export type NodesByKind = {
	[k in NodeKind]: NodeDefinitionsByKind[k]
}

export type NodeKind = keyof NodeDefinitionsByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export abstract class Kinded {
	abstract kind: NodeKind

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}
}

export abstract class Fingerprinted {
	id = this.hash()

	abstract hash(): string

	equals(other: Fingerprinted) {
		return this.id === other.id
	}
}
