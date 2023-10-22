import { throwParseError } from "@arktype/util"
import { type BaseAttributes, BaseNode, type Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import { getBasisName } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export interface PatternChildren extends BaseAttributes {
	rule: string
	flags?: string
}

export type PatternSchema = RegexLiteral | RegExp | PatternChildren

export class PatternNode
	extends BaseNode<PatternChildren, typeof PatternNode>
	implements BaseRefinement
{
	static readonly kind = "pattern"

	static keyKinds = this.declareKeys({
		rule: "in",
		flags: "in"
	})

	static intersections = this.defineIntersections({
		// For now, non-equal regex are naively intersected
		pattern: () => null
	})

	instance = new RegExp(this.rule, this.flags)
	literal = serializeRegex(this.instance)

	static from(schema: PatternSchema) {
		return new PatternNode(
			typeof schema === "string"
				? parseRegexLiteral(schema)
				: schema instanceof RegExp
				? { rule: schema.source, flags: schema.flags }
				: schema
		)
	}

	static writeDefaultDescription(children: PatternChildren) {
		return `matched by /${children.rule}/${children.flags}`
	}

	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is DomainNode<"string"> {
		return (
			basis !== undefined && basis.kind === "domain" && basis.rule === "string"
		)
	}

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return `Match operand ${getBasisName(basis)} must be a string`
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
