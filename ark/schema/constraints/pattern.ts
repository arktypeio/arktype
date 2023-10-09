import type { conform } from "@arktype/util"
import { Hkt, throwParseError } from "@arktype/util"
import { type BaseAttributes } from "../node.js"
import type { Basis } from "./basis.js"
import { BaseConstraint, constraintParser } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export interface PatternSchema extends BaseAttributes {
	source: string
	flags: string
}

export type PatternInput = RegexLiteral | RegExp | PatternSchema

export class PatternNode
	extends BaseConstraint<PatternSchema>
	implements BaseRefinement
{
	readonly kind = "pattern"

	protected constructor(schema: PatternSchema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], PatternInput>) => {
			return new PatternNode(
				typeof input === "string"
					? parseRegexLiteral(input)
					: input instanceof RegExp
					? { source: input.source, flags: input.flags }
					: input
			)
		}
	})()

	static from = constraintParser(this)

	applicableTo(
		basis: Basis | undefined
	): basis is DomainNode<{ domain: "string" }> {
		return (
			basis !== undefined &&
			basis.kind === "domain" &&
			basis.domain === "string"
		)
	}

	instance = new RegExp(this.source, this.flags)
	literal = serializeRegex(this.instance)

	hash() {
		return ""
	}

	writeDefaultDescription() {
		return `matched by ${this.literal}`
	}

	// For now, non-equal regex are naively intersected
	intersectSymmetric() {
		return null
	}

	intersectAsymmetric() {
		return null
	}
}

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) => `${regex}` as RegexLiteral

export type RegexLiteral = `/${string}/${string}`

const regexLiteralMatcher = /^\/(.+)\/([a-z]*)$/

// export const patternConstraint = (input: PatternInput): PatternDefinition =>
// 	typeof input === "string" ? parseRegexLiteral(input) : input

export const parseRegexLiteral = (literal: string): PatternSchema => {
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
