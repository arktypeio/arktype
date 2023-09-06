import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface IdentitySchema extends ConstraintSchema {
	rule: unknown
}

export class IdentityNode extends ConstraintNode<IdentitySchema> {
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
