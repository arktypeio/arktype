import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { BaseNode } from "../type.js"

export class IdentityConstraint extends BaseNode<{
	rule: unknown
	attributes: {}
	intersections: Disjoint
}> {
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
