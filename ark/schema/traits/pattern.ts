import { throwParseError } from "@arktype/util"
import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./constraint.js"

export type PatternInput = RegexLiteral | PatternDefinition | RegExp

export interface PatternDefinition extends BaseDefinition {
	source: string
	flags: string
}

export const patternConstraint = (input: PatternInput): PatternDefinition =>
	typeof input === "string" ? parseRegexLiteral(input) : input

export class PatternNode extends RuleNode<PatternDefinition> {
	readonly kind = "pattern"

	readonly regex = new RegExp(this.source, this.flags)
	readonly literal = serializeRegex(this.regex)

	writeDefaultDescription() {
		return `matched by ${this.literal}`
	}

	protected reduceRules() {
		return null
	}
}

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) => `${regex}` as RegexLiteral

export type RegexLiteral = `/${string}/${string}`

const regexLiteralMatcher = /^\/(.+)\/([a-z]*)$/

export const parseRegexLiteral = (literal: string): PatternDefinition => {
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
