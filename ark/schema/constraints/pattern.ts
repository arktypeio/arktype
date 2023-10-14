import { throwParseError } from "@arktype/util"
import type { BaseAttributes, Node, Prevalidated } from "../node.js"
import type { BasisKind } from "./basis.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export interface PatternChildren extends BaseAttributes {
	rule: string
	flags?: string
}

export type PatternSchema = RegexLiteral | RegExp | PatternChildren

export class PatternNode
	extends BaseConstraint<PatternChildren>
	implements BaseRefinement
{
	readonly kind = "pattern"

	instance = new RegExp(this.rule, this.flags)
	literal = serializeRegex(this.instance)

	defaultDescription = `matched by ${this.literal}`

	static from(schema: PatternSchema) {
		return new PatternNode(
			typeof schema === "string"
				? parseRegexLiteral(schema)
				: schema instanceof RegExp
				? { rule: schema.source, flags: schema.flags }
				: schema
		)
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

export const parseRegexLiteral = (literal: string): PatternChildren => {
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
