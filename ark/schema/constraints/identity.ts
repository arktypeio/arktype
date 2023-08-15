import type { satisfy } from "@arktype/util"
import { stringify } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import type { NodeDefinition } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export type IdentityNodeDefinition = satisfy<
	NodeDefinition,
	{
		kind: "identity"
		rule: unknown
		attributes: UniversalAttributes
		class: typeof IdentityConstraint
	}
>

// TODO: to constraint
export class IdentityConstraint extends ConstraintNode<IdentityNodeDefinition> {
	readonly kind = "identity"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	reduceWithRuleOf(other: this) {
		return other.allows(this.rule)
			? this.rule
			: Disjoint.from("identity", this, other)
	}
}
