import type { satisfy } from "@arktype/util"
import { stringify } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import type { NodeDefinition } from "../node.js"
import { BaseNode } from "../node.js"

export type IdentityDefinition = satisfy<
	NodeDefinition,
	{
		kind: "identity"
		rule: unknown
		attributes: UniversalAttributes
		node: IdentityConstraint
	}
>

export class IdentityConstraint extends BaseNode<IdentityDefinition> {
	readonly kind = "identity"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersectRules(other: this) {
		return other.allows(this.rule)
			? this.rule
			: Disjoint.from("identity", this, other)
	}
}
