import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseNode } from "../type.js"
import { ConstraintNode } from "./constraint.js"

export class EqualityConstraint extends ConstraintNode<unknown> {
	readonly kind = "equality"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersectRules(other: BaseNode) {
		return Disjoint.from("unit", this, other)
	}
}
