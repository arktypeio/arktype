import { throwParseError } from "@arktype/util"
import { BaseNode, type declareNode, type withAttributes } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type { DomainNode } from "../bases/domain.js"
import { builtins } from "../builtins.js"
import { type Node } from "../nodes.js"
import { type Root } from "../root.js"

import { getBasisName } from "./shared.js"

export type PatternInner = withAttributes<{
	readonly pattern: RegExp
}>

export type ExpandedPatternSchema = withAttributes<{
	readonly pattern: RegexLiteral | RegExp
}>

export type PatternSchema = RegexLiteral | RegExp | ExpandedPatternSchema

export type PatternDeclaration = declareNode<{
	kind: "pattern"
	schema: PatternSchema
	inner: PatternInner
	intersections: {
		pattern: "pattern" | null
	}
}>

export class PatternNode extends BaseNode<PatternDeclaration> {
	static readonly kind = "pattern"
	static readonly declaration: PatternDeclaration

	static readonly definition = this.define({
		kind: "pattern",
		keys: {
			pattern: "in"
		},
		intersections: {
			// For now, non-equal regex are naively intersected
			pattern: () => null
		},
		parseSchema: (schema) =>
			typeof schema === "string" || schema instanceof RegExp
				? { pattern: parseRegexInput(schema) }
				: { ...schema, pattern: parseRegexInput(schema.pattern) },
		reduceToNode: (inner) => new PatternNode(inner),
		compileCondition: (inner) => `${inner.pattern}.test(${this.argName})`,
		writeDefaultDescription: (inner) => `matched by ${inner.pattern}`
	})

	static basis: DomainNode<string> = builtins().string

	static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
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
