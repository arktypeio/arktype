import type { conform, Hkt } from "@arktype/util"
import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface IdentitySchema extends ConstraintSchema {
	is: unknown
}

export class IdentityNode extends ConstraintNode<
	IdentitySchema,
	typeof IdentityNode
> {
	readonly kind = "identity"

	declare f: (
		input: conform<this[Hkt.In], IdentitySchema>
	) => (typeof input)["is"]

	static parse(input: IdentitySchema) {
		return input
	}

	hash() {
		return compileSerializedValue(this.is)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.is)
	}

	reduceWith(other: Constraint) {
		return other.kind === "identity"
			? Disjoint.from("identity", this, other)
			: null
	}
}
