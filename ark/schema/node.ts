import { type extend } from "@arktype/util"
import type { ConstraintsByKind } from "./constraints/constraint.js"
import type { Disjoint } from "./disjoint.js"
import type { TypeRootsByKind } from "./types/type.js"

export type NodesByKind = extend<TypeRootsByKind, ConstraintsByKind>

export type NodeClass<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export type NodeKind = keyof NodesByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export abstract class Kinded {
	abstract kind: NodeKind

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}
}

export type NodeMethods<children> = {
	parse: RuleParser<children>
	serialize: RuleSerializer<children>
	intersect: RuleIntersector<children>
}

// abstract class Node2<def = unknown> {
// 	readonly nodeId: string
// 	protected ownConstructor = this.constructor as new (def: def) => this

// 	constructor(public definition: def) {
// 		this.nodeId = methods.serialize(definition)
// 	}

// 	protected abstract intersectRules(other: this): string

// 	intersect(other: this): this | Disjoint {
// 		if (this === other) {
// 			return this
// 		}
// 		const intersection = methods.intersect(this.definition, other.definition)
// 		return intersection instanceof Disjoint
// 			? intersection
// 			: new this.ownConstructor(intersection as never)
// 	}
// }

export abstract class Hashable {
	id = this.hash()

	abstract hash(): string

	equals(other: Hashable) {
		return this.id === other.id
	}
}

export type RuleIntersector<rule> = (
	l: rule,
	r: rule
) => readonly rule[] | Disjoint

export type RuleParser<rule, input = never> = (input: input | rule) => rule

export type RuleSerializer<rule> = (rule: rule) => string
