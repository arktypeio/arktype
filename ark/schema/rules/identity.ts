import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./rule.js"

export interface IdentityRule extends BaseDefinition {
	readonly value: number
}

// TODO: to constraint
export class IdentityConstraint extends RuleNode<IdentityRule> {
	readonly kind = "identity"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.value)
	}

	reduceRules(other: IdentityConstraint) {
		return Disjoint.from("identity", this, other)
	}
}
