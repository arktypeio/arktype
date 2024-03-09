import { jsData } from "../../shared/compile.js"
import type { declareNode } from "../../shared/declare.js"
import {
	BasePrimitiveConstraint,
	type PrimitiveConstraintInner
} from "../constraint.js"

export interface RegexInner extends PrimitiveConstraintInner<string> {
	readonly flags?: string
}

export type regex<s extends string> = { [_ in s]: true }

export type NormalizedRegexSchema = RegexInner

export type RegexSchema = NormalizedRegexSchema | string | RegExp

export type RegexDeclaration = declareNode<{
	kind: "regex"
	schema: RegexSchema
	normalizedSchema: NormalizedRegexSchema
	inner: RegexInner
	hasOpenIntersection: true
	prerequisite: string
	errorContext: RegexInner
}>

export class RegexNode extends BasePrimitiveConstraint<
	RegexDeclaration,
	typeof RegexNode
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
			regex: () => null
		},
		defaults: {
			description(node) {
				return `matched by ${node.rule}`
			}
		}
	})

	readonly regex = new RegExp(this.rule, this.flags)
	readonly expression = `${this.regex}`
	traverseAllows = this.regex.test

	readonly compiledCondition = `${this.expression}.test(${jsData})`
	readonly compiledNegation = `!${this.compiledCondition}`
	readonly impliedBasis = this.$.tsKeywords.string
	readonly errorContext = this.createErrorContext(this.inner)
}
