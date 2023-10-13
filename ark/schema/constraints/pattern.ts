import { throwParseError } from "@arktype/util"
import type { BaseAttributes, Node, Prevalidated } from "../node.js"
import type { BasisKind } from "./basis.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export interface PatternSchema extends BaseAttributes {
	rule: string
	flags?: string
}

export class PatternNode extends BaseConstraint implements BaseRefinement {
	readonly kind = "pattern"

	readonly rule: string
	readonly flags: string
	readonly instance: RegExp
	readonly literal: RegexLiteral

	constructor(public schema: PatternSchema) {
		super(schema)
		this.rule = schema.rule
		this.flags = schema.flags ?? ""
		this.instance = new RegExp(this.rule, this.flags)
		this.literal = serializeRegex(this.instance)
	}

	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is DomainNode<"string"> {
		return (
			basis !== undefined && basis.kind === "domain" && basis.rule === "string"
		)
	}

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
		rule: match[1],
		flags: match[2]
	}
}
