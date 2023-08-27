import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./constraint.js"

export interface IdentityDefinition extends BaseDefinition {
	readonly value: number
}

// TODO: to constraint
export class IdentityNode extends RuleNode<IdentityDefinition> {
	readonly kind = "identity"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.value)
	}

	reduceRules(other: IdentityNode) {
		return Disjoint.from("identity", this, other)
	}
}
