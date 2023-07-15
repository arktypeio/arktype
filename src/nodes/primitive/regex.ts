import { In } from "../../compiler/compile.js"
import { NodeBase } from "../base.js"

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
	`${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
	literal.slice(1, literal.lastIndexOf("/"))

export type RegexIntersection = readonly RegexNode[]

export class RegexNode extends NodeBase<{
	rule: SerializedRegexLiteral
	intersection: RegexIntersection
	meta: {}
}> {
	readonly kind = "regex"

	compile() {
		return `${this.rule}.test(${In})`
	}

	intersect(other: RegexIntersection) {
		const matching = other.find((node) => node.rule === this.rule)
		return matching ? other : [...other, this]
	}

	describe() {
		return `matched by ${this.rule}`
	}
}
