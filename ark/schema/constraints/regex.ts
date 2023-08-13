import { isArray } from "@arktype/util"
import { ConstraintNode } from "./constraint.js"

export class PatternConstraint extends ConstraintNode<"pattern"> {
	readonly kind = "pattern"
	readonly literal = `${this.rule}` as `/${string}/${string}`

	writeDefaultDescription() {
		return isArray(this.rule)
			? this.rule.join(" and ")
			: `matched by ${this.rule}`
	}

	compare() {
		return null
	}
}

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
	`${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
	literal.slice(1, literal.lastIndexOf("/"))
