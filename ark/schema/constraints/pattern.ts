import { throwParseError } from "@arktype/util"
import { ConstraintNode } from "./constraint.js"

export type PatternInput = RegexLiteral | PatternRule | RegExp

export type PatternRule = {
	source: string
	flags: string
}

export const patternConstraint = (input: PatternInput): PatternRule =>
	typeof input === "string" ? parseRegexLiteral(input) : input

export class PatternConstraint extends ConstraintNode<PatternRule> {
	readonly kind = "pattern"
	readonly source = this.rule.source
	readonly flags = this.rule.flags
	readonly regex =
		this.rule instanceof RegExp
			? this.rule
			: new RegExp(this.source, this.flags)
	readonly literal = serializeRegex(this.regex)

	writeDefaultDescription() {
		return `matched by ${this.literal}`
	}

	protected reduceWithRuleOf() {
		return null
	}
}

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) => `${regex}` as RegexLiteral

export type RegexLiteral = `/${string}/${string}`

const regexLiteralMatcher = /^\/(.+)\/([a-z]*)$/

export const parseRegexLiteral = (literal: string): PatternRule => {
	const match = regexLiteralMatcher.exec(literal)
	if (!match || !match[1]) {
		return throwParseError(
			`'${literal}' is not a valid RegexLiteral (should be /source/flags)`
		)
	}
	return {
		source: match[1],
		flags: match[2]
	}
}
