import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { TypeNode } from "../type.js"

export class EqualityConstraint extends TypeNode<unknown> {
	readonly kind = "equality"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersectUniqueRules(other: TypeNode) {
		return Disjoint.from("unit", this, other)
	}
}
