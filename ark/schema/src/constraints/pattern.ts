import type { BaseConstraints } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "./constraint.js"

export interface PatternRule extends BaseConstraints {
	readonly source: string
	readonly flags?: string
}

export class PatternNode extends BaseNode<PatternRule, typeof PatternNode> {
	readonly literal = toLiteral(this.constraints)

	static writeDefaultDescription(rule: PatternRule) {
		return `matched by ${toLiteral(rule)}`
	}

	intersectOwnKeys(other: PatternNode) {
		return this.literal === other.literal ? this.constraints : null
	}
}

export const PatternSet = ConstraintSet<readonly PatternNode[]>

export type PatternSet = InstanceType<typeof PatternSet>

const toLiteral = (rule: PatternRule) => `/${rule.source}/${rule.flags ?? ""}`
