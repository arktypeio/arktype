import type { satisfy } from "@arktype/util"
import type { UniversalAttributes } from "../../attributes/attribute.js"
import type { NodeDefinition } from "../../node.js"
import { ConstraintNode } from "../constraint.js"

export type PropNodeDefinition = satisfy<
	NodeDefinition,
	{
		kind: "prop"
		rule: {}
		attributes: UniversalAttributes
		instance: PropConstraint
	}
>

export class PropConstraint extends ConstraintNode<PropNodeDefinition> {
	readonly kind = "prop"

	writeDefaultDescription() {
		return ""
	}

	reduceWithRuleOf(other: ConstraintNode) {
		if (!other.hasKind("prop")) {
			return null
		}
		return this.rule
	}
}
