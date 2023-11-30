import type { extend } from "@arktype/util"
import { In, compilePrimitive } from "../shared/compilation.js"
import type { withAttributes } from "../shared/declare.js"
import type { PrimitiveConstraintAttachments } from "../shared/define.js"
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

export type PatternAttachments = extend<
	PrimitiveConstraintAttachments<"pattern">,
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
	attach: PatternAttachments
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
	operand: ["string"],
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
		const regex = new RegExp(node.source, node.flags)
		return {
			assertValidBasis: createValidBasisAssertion(node),
			regex,
			allows: regex.test,
			condition: `/${node.source}/${node.flags ?? ""}.test(${In})`,
			negatedCondition: `/${node.source}/${
				node.flags ?? ""
			}.test(${In}) === false`
		}
	},
	compile: compilePrimitive
})
