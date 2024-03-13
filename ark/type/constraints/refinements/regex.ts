import { jsData } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { BasePrimitiveConstraint } from "../constraint.js"

export interface RegexInner extends BaseMeta {
	readonly regex: string
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
	intersectionIsOpen: true
	prerequisite: string
	errorContext: RegexInner
}>

export class RegexNode extends BasePrimitiveConstraint<RegexDeclaration> {
	static implementation = this.implement({
		collapsibleKey: "regex",
		keys: {
			regex: {},
			flags: {}
		},
		normalize: (schema) =>
			typeof schema === "string"
				? { regex: schema }
				: schema instanceof RegExp
				? schema.flags
					? { regex: schema.source, flags: schema.flags }
					: { regex: schema.source }
				: schema,
		hasAssociatedError: true,
		intersectionIsOpen: true,
		intersections: {
			// for now, non-equal regex are naively intersected
			regex: () => null
		},
		defaults: {
			description(node) {
				return `matched by ${node.regex}`
			}
		}
	})

	readonly instance = new RegExp(this.regex, this.flags)
	readonly expression = `${this.instance}`
	traverseAllows = this.instance.test.bind(this.instance)

	readonly compiledCondition = `${this.expression}.test(${jsData})`
	readonly compiledNegation = `!${this.compiledCondition}`
	readonly impliedBasis = this.$.tsKeywords.string
	readonly errorContext = this.createErrorContext(this.inner)
}
