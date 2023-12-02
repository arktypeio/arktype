import type { extend } from "@arktype/util"
import { composeParser } from "../parse.js"
import { In, composePrimitiveTraversal } from "../shared/compilation.js"
import type { BaseAttributes, withAttributes } from "../shared/declare.js"
import type { PrimitiveConstraintAttachments } from "../shared/define.js"
import {
	composeOperandAssertion,
	composeRefinement,
	type declareRefinement
} from "./shared.js"

export type PatternInner = {
	readonly source: string
	readonly flags?: string
}

export type NormalizedPatternSchema = withAttributes<PatternInner>

export type PatternSchema = NormalizedPatternSchema | string | RegExp

export type PatternAttachments = extend<
	PrimitiveConstraintAttachments,
	{ regex: RegExp }
>

export type PatternDeclaration = declareRefinement<{
	kind: "pattern"
	schema: PatternSchema
	inner: PatternInner
	intersections: {
		pattern: "pattern" | null
	}
	operand: string
}>

export const PatternImplementation = composeRefinement<PatternDeclaration>({
	kind: "pattern",
	collapseKey: "source",
	keys: {
		source: {},
		flags: {}
	},
	operand: ["string"],
	normalize: (schema) =>
		typeof schema === "string"
			? { source: schema }
			: schema instanceof RegExp
			  ? schema.flags
					? { source: schema.source, flags: schema.flags }
					: { source: schema.source }
			  : schema,
	attach: (node) => {
		const regex = new RegExp(node.source, node.flags)
		return {
			assertValidBasis: composeOperandAssertion(node),
			regex,
			traverseAllows: regex.test,
			traverseApply: composePrimitiveTraversal(node, regex.test),
			condition: `/${node.source}/${node.flags ?? ""}.test(${In})`,
			negatedCondition: `/${node.source}/${
				node.flags ?? ""
			}.test(${In}) === false`
		}
	}
})

// intersections: {
// 	// For now, non-equal regex are naively intersected
// 	pattern: () => null
// },
// writeDefaultDescription: (inner) => `matched by ${inner.source}`,
// compile: compilePrimitive
