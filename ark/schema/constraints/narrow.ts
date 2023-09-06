import { compileSerializedValue } from "../io/compile.js"
import type { TraversalState } from "../io/traverse.js"
import type { Basis, ConstraintSchema } from "./constraint.js"
import { ConstraintNode, RefinementNode } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { PrototypeNode } from "./prototype.js"

export interface NarrowSchema extends ConstraintSchema {
	rule: Narrow
}

export class NarrowNode extends RefinementNode<
	NarrowSchema,
	typeof NarrowNode
> {
	readonly kind = "narrow"

	static parse(input: Narrow | NarrowSchema) {
		return typeof input === "function" ? { rule: input } : input
	}

	applicableTo(
		basis: Basis | undefined
	): basis is DomainNode | PrototypeNode | undefined {
		return (
			basis === undefined ||
			basis.hasKind("domain") ||
			basis.hasKind("prototype")
		)
	}

	hash() {
		return compileSerializedValue(this.rule)
	}

	writeDefaultDescription() {
		return `valid according to ${this.rule.name}`
	}

	reduceWith() {
		return null
	}
}

// TODO: allow changed order to be the same type

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.

export type Narrow<data = any> = (
	data: data,
	traversal: TraversalState
) => boolean

export type NarrowCast<data = any, narrowed extends data = data> = (
	data: data
) => data is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
