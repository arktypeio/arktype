import type { ConstraintRule } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export interface RegexRule extends ConstraintRule {
	readonly source: string
	readonly flags: string
}

export class RegexNode extends ConstraintNode<RegexRule, typeof RegexNode> {
	readonly source = this.rule.source
	readonly flags = this.rule.flags
	readonly literal = toLiteral(this.rule)

	static writeDefaultDescription(def: RegexRule) {
		return `matched by ${toLiteral(def)}`
	}

	intersectOwnKeys(other: RegexNode) {
		return this.literal === other.literal ? this.rule : null
	}
}

export const RegexSet = ConstraintSet<readonly RegexNode[]>

const toLiteral = (def: RegexRule) => `/${def.source}/${def.flags}`
