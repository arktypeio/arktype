import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { composeConstraint } from "./constraint.js"

export class IdentityConstraint extends composeConstraint<unknown>((l, r) =>
	Disjoint.from("identity", l, r)
) {
	readonly kind = "identity"

	hash() {
		return compileSerializedValue(this.rule)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}
}
