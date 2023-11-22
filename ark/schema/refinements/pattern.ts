import { throwParseError } from "@arktype/util"
import { In } from "../io/compile.js"
import type { withAttributes } from "../shared/declare.js"
import type { ConstraintAttachments } from "../shared/define.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "./shared.js"

export type PatternInner = withAttributes<{
	readonly pattern: string
	readonly flags?: string
}>

export type PatternSchema = PatternInner | RegexLiteral | RegExp

export type PatternDeclaration = declareRefinement<{
	kind: "pattern"
	schema: PatternSchema
	inner: PatternInner
	intersections: {
		pattern: "pattern" | null
	}
	operands: string
	attach: ConstraintAttachments
}>

export const PatternImplementation = defineRefinement({
	kind: "pattern",
	keys: {
		pattern: {},
		flags: {}
	},
	intersections: {
		// For now, non-equal regex are naively intersected
		pattern: () => null
	},
	operands: ["string"],
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
			assertValidBasis: createValidBasisAssertion(node),
			condition: `/${node.pattern}/${node.flags ?? ""}.test(${In})`
		}
	}
})

export function writeUnmatchableBasisMessage(basis: string) {
	return `Match operand ${basis} must be a string`
}

// static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
// 	return
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
