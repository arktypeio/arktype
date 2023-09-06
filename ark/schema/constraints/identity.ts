import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export class IdentityConstraint extends ConstraintNode<{
	rule: unknown
}> {
	readonly kind = "identity"

	hash() {
		return compileSerializedValue(this.rule)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	reduceWith(other: Constraint) {
		return other.kind === "identity"
			? Disjoint.from("identity", this, other)
			: null
	}
}
