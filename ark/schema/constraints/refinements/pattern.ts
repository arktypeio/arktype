import { jsData } from "../../shared/compile.js"
import type { declareNode } from "../../shared/declare.js"
import {
	BasePrimitiveConstraint,
	type PrimitiveConstraintInner
} from "../constraint.js"

export interface PatternInner extends PrimitiveConstraintInner<string> {
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
		collapseKey: "rule",
		keys: {
			rule: {},
			flags: {}
		},
		normalize: (schema) =>
			typeof schema === "string"
				? { rule: schema }
				: schema instanceof RegExp
				? schema.flags
					? { rule: schema.source, flags: schema.flags }
					: { rule: schema.source }
				: schema,
		hasAssociatedError: true,
		hasOpenIntersection: true,
		intersections: {
			// for now, non-equal regex are naively intersected
			pattern: () => null
		},
		defaults: {
			description(inner) {
				return `matched by ${inner.rule}`
			}
		}
	})

	regex = new RegExp(this.rule, this.flags)
	traverseAllows = this.regex.test

	compiledCondition = `/${this.rule}/${this.flags ?? ""}.test(${jsData})`
	compiledNegation = `!${this.compiledCondition}`

	readonly expectedContext = this.createExpectedContext(this.inner)

	// if (into.basis?.domain !== "string") {
	// 	throwInvalidOperandError("pattern", "a string", into.basis)
	// }
}
