import type { ConstraintRule } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export interface RegexRule extends ConstraintRule {
	readonly source: string
	readonly flags: string
}

export class RegexNode extends ConstraintNode<RegexRule, typeof RegexNode> {
	readonly literal = toLiteral(this.rule)

	static writeDefaultDescription(def: RegexRule) {
		return `matched by ${toLiteral(def)}`
	}

	intersectOwnKeys(other: RegexNode) {
		return this.literal === other.literal ? this.rule : null
	}
}

export const RegexSet = ConstraintSet<readonly RegexNode[]>

export type RegexSet = typeof RegexSet

const toLiteral = (def: RegexRule) => `/${def.source}/${def.flags}`
