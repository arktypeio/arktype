import type { BaseRule } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "./constraint.js"

export interface PatternRule extends BaseRule {
	readonly source: string
	readonly flags?: string
}

export class PatternNode extends BaseNode<PatternRule, typeof PatternNode> {
	readonly literal = toLiteral(this.rule)

	static writeDefaultDescription(def: PatternRule) {
		return `matched by ${toLiteral(def)}`
	}

	intersectOwnKeys(other: PatternNode) {
		return this.literal === other.literal ? this.rule : null
	}
}

export const PatternSet = ConstraintSet<readonly PatternNode[]>

export type PatternSet = typeof PatternSet

const toLiteral = (def: PatternRule) => `/${def.source}/${def.flags ?? ""}`
