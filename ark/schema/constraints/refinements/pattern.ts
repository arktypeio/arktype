import { jsData } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { BasePrimitiveConstraint } from "../constraint.js"

export interface PatternInner extends BaseMeta {
	readonly source: string
	readonly flags?: string
}

export type NormalizedPatternSchema = PatternInner

export type PatternSchema = NormalizedPatternSchema | string | RegExp

export type PatternDeclaration = declareNode<{
	kind: "pattern"
	schema: PatternSchema
	normalizedSchema: NormalizedPatternSchema
	inner: PatternInner
	composition: "primitive"
	hasOpenIntersection: true
	prerequisite: string
	expectedContext: PatternInner
}>

export class PatternNode extends BasePrimitiveConstraint<
	PatternDeclaration,
	typeof PatternNode
> {
	static implementation = this.implement({
		collapseKey: "source",
		keys: {
			source: {},
			flags: {}
		},
		normalize: (schema) =>
			typeof schema === "string"
				? { source: schema }
				: schema instanceof RegExp
				? schema.flags
					? { source: schema.source, flags: schema.flags }
					: { source: schema.source }
				: schema,
		hasAssociatedError: true,
		hasOpenIntersection: true,
		intersections: {
			// for now, non-equal regex are naively intersected
			pattern: () => null
		},
		defaults: {
			description(inner) {
				return `matched by ${inner.source}`
			}
		}
	})

	regex = new RegExp(this.source, this.flags)
	traverseAllows = this.regex.test

	compiledCondition = `/${this.source}/${this.flags ?? ""}.test(${jsData})`
	compiledNegation = `!${this.compiledCondition}`

	readonly expectedContext = this.createExpectedContext(this.inner)

	// if (into.basis?.domain !== "string") {
	// 	throwInvalidOperandError("pattern", "a string", into.basis)
	// }
}
