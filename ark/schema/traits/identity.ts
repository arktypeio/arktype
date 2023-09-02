import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseConstraintParameters } from "./constraint.js"
import { composeConstraint } from "./constraint.js"

export class IdentityConstraint<
	const rule = unknown
> extends composeConstraint<unknown>((l, r) =>
	Disjoint.from("identity", l, r)
) {
	readonly kind = "identity"
	declare infer: rule
	declare rule: rule

	constructor(...args: BaseConstraintParameters<rule>) {
		super(...args)
	}

	hash() {
		return compileSerializedValue(this.rule)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}
}
