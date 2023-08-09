import type { Orthogonal } from "./constraint.js"
import { Constraint, orthogonal } from "./constraint.js"

export class RegexConstraint extends Constraint<RegExp> {
	readonly literal = `${this.rule}` as `/${string}/${string}`

	writeDefaultDescription() {
		// don't use this.literal here since it may not have been initialized
		return `matched by ${this.rule}`
	}

	// TODO: remove annotation?
	intersectConstraint(): Orthogonal {
		return orthogonal
	}
}

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
	`${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
	literal.slice(1, literal.lastIndexOf("/"))
