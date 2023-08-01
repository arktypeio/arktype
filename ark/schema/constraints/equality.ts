import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { Constraint } from "./constraint.js"

export class EqualityConstraint extends Constraint<unknown> {
	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersectRules(other: this) {
		return this.equals(other)
			? new EqualityConstraint(this.rule)
			: Disjoint.from("unit", this, other)
	}
}
