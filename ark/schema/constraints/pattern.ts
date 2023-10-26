import { throwParseError } from "@arktype/util"
import { type BaseAttributes, BaseNode, type Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import { getBasisName } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export interface PatternChildren extends BaseAttributes {
	readonly pattern: RegExp
}

export interface ExpandedPatternSchema extends BaseAttributes {
	readonly pattern: RegexLiteral | RegExp
}

export type PatternSchema = RegexLiteral | RegExp | ExpandedPatternSchema

export class PatternNode
	extends BaseNode<PatternChildren, typeof PatternNode>
	implements BaseRefinement
{
	static readonly kind = "pattern"

	static readonly keyKinds = this.declareKeys({
		pattern: "in"
	})

	static readonly intersections = this.defineIntersections({
		// For now, non-equal regex are naively intersected
		pattern: () => null
	})

	static from(schema: PatternSchema) {
		return new PatternNode(
			typeof schema === "string" || schema instanceof RegExp
				? { pattern: parseRegexInput(schema) }
				: { ...schema, pattern: parseRegexInput(schema.pattern) }
		)
	}

	static readonly compile = this.defineCompiler(
		(children) => `${children.pattern}.test(${this.argName})`
	)

	static writeDefaultDescription(children: PatternChildren) {
		return `matched by ${children.pattern}`
	}

	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is DomainNode<"string"> {
		return (
			basis !== undefined &&
			basis.kind === "domain" &&
			basis.domain === "string"
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

const parseRegexInput = (input: string | RegExp) =>
	input instanceof RegExp ? input : parseRegexLiteral(input)

export const parseRegexLiteral = (literal: string) => {
	const match = regexLiteralMatcher.exec(literal)
	if (!match || !match[1]) {
		return throwParseError(
			`'${literal}' is not a valid RegexLiteral (should be /source/flags)`
		)
	}
	return new RegExp(match[1], match[2])
}
