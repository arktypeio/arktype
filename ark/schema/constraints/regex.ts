import type { Orthogonal } from "../type.js"
import { orthogonal, TypeNode } from "../type.js"

export class RegexConstraint extends TypeNode<RegExp> {
	readonly literal = `${this.rule}` as `/${string}/${string}`
	readonly kind = "regex"

	writeDefaultDescription() {
		// don't use this.literal here since it may not have been initialized
		return `matched by ${this.rule}`
	}

	intersectRules(): Orthogonal {
		return orthogonal
	}
}

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
	`${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
	literal.slice(1, literal.lastIndexOf("/"))
