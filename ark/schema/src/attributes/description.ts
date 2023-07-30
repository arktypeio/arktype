import { intersectUniqueLists } from "@arktype/util"
import type { BaseConstraints } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "../constraints/constraint.js"

export interface DescriptionRule extends BaseConstraints {
	readonly parts: readonly string[]
}

export class DescriptionNode extends BaseNode<
	DescriptionRule,
	typeof DescriptionNode
> {
	static writeDefaultDescription(rule: DescriptionRule) {
		return rule.parts.join(" and ")
	}

	intersectOwnKeys(other: DescriptionNode) {
		return {
			parts: intersectUniqueLists(this.parts, other.parts)
		}
	}
}

export const DescriptionSet = ConstraintSet<readonly DescriptionNode[]>

export type DescriptionSet = InstanceType<typeof DescriptionSet>
