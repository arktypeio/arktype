// TODO: allow changed order to be the same type
import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./trait.js"

export interface NarrowDefinition extends BaseDefinition {
	readonly value: Narrow
}

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.
export class NarrowNode extends RuleNode<NarrowDefinition> {
	readonly kind = "narrow"

	writeDefaultDescription() {
		return `valid according to ${this.value.name}`
	}

	protected reduceRules() {
		return null
	}
}

export type Narrow<data = any> = (data: data) => boolean

export type NarrowCast<data = any, narrowed extends data = data> = (
	data: data
) => data is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
