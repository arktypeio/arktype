import type { satisfy } from "@arktype/util"
import { isArray } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import type { NodeDefinition } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export type PatternNodeDefinition = satisfy<
	NodeDefinition,
	{
		kind: "pattern"
		rule: RegExp
		attributes: UniversalAttributes
		node: PatternConstraint
	}
>

export class PatternConstraint extends ConstraintNode<PatternNodeDefinition> {
	readonly kind = "pattern"
	readonly literal = `${this.rule}` as `/${string}/${string}`

	writeDefaultDescription() {
		return isArray(this.rule)
			? this.rule.join(" and ")
			: `matched by ${this.rule}`
	}

	protected reduceWithRuleOf() {
		return null
	}
}

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
	`${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
	literal.slice(1, literal.lastIndexOf("/"))
