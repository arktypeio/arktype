import { throwParseError } from "@arktype/util"
import { In } from "../io/compile.ts"
import type { declareNode, withAttributes } from "../shared/declare.ts"
import { defineNode } from "../shared/define.ts"
import type { ConstraintAttachments } from "./constraint.ts"

export type PatternInner = withAttributes<{
	readonly pattern: string
	readonly flags?: string
}>

export type CollapsedPatternSchema = RegexLiteral | RegExp

export type ExpandedPatternSchema = PatternInner

export type PatternDeclaration = declareNode<{
	kind: "pattern"
	collapsedSchema: CollapsedPatternSchema
	expandedSchema: PatternInner
	inner: PatternInner
	intersections: {
		pattern: "pattern" | null
	}
	attach: ConstraintAttachments<string>
}>

export const PatternImplementation = defineNode({
	kind: "pattern",
	keys: {
		pattern: {},
		flags: {}
	},
	intersections: {
		// For now, non-equal regex are naively intersected
		pattern: () => null
	},
	normalize: (schema) =>
		typeof schema === "string"
			? parseRegexLiteral(schema)
			: schema instanceof RegExp
			  ? schema.flags
					? { pattern: schema.source, flags: schema.flags }
					: { pattern: schema.source }
			  : schema,
	writeDefaultDescription: (inner) => `matched by ${inner.pattern}`,
	attach: (node) => {
		return {
			implicitBasis: node.ctor.builtins.string,
			condition: `/${node.pattern}/${node.flags ?? ""}.test(${In})`
		}
	}
})

// static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
// 	return `Match operand ${getBasisName(basis)} must be a string`
// }

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) => `${regex}` as RegexLiteral

export type RegexLiteral = `/${string}/${string}`

const regexLiteralMatcher = /^\/(.+)\/([a-z]*)$/

export const parseRegexLiteral = (literal: string): PatternInner => {
	const match = regexLiteralMatcher.exec(literal)
	if (!match || !match[1]) {
		return throwParseError(
			`'${literal}' is not a valid RegexLiteral (should be /source/flags)`
		)
	}
	return match[2]
		? {
				pattern: match[1],
				flags: match[2]
		  }
		: {
				pattern: match[1]
		  }
}
