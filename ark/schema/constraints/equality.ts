import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { TypeNode } from "../type.js"

export class EqualityConstraint extends TypeNode<unknown> {
	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersectRules(other: TypeNode) {
		return this.equals(other)
			? new EqualityConstraint(this.rule)
			: Disjoint.from("unit", this, other)
	}
}
