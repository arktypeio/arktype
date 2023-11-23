import { In } from "../io/compile.js"
import type { withAttributes } from "../shared/declare.js"
import type { ConstraintAttachments } from "../shared/define.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "./shared.js"

export type PatternInner = withAttributes<{
	readonly source: string
	readonly flags?: string
}>

export type PatternSchema = string | PatternInner | RegExp

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
	collapseKey: "source",
	keys: {
		source: {},
		flags: {}
	},
	intersections: {
		// For now, non-equal regex are naively intersected
		pattern: () => null
	},
	operands: ["string"],
	normalize: (schema) =>
		typeof schema === "string"
			? { source: schema }
			: schema instanceof RegExp
			  ? schema.flags
					? { source: schema.source, flags: schema.flags }
					: { source: schema.source }
			  : schema,
	writeDefaultDescription: (inner) => `matched by ${inner.source}`,
	attach: (node) => {
		return {
			assertValidBasis: createValidBasisAssertion(node),
			condition: `/${node.source}/${node.flags ?? ""}.test(${In})`
		}
	}
})
