import { RawPrimitiveConstraint } from "../constraint.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { implementNode } from "../shared/implement.js"

export interface RegexInner extends BaseMeta {
	readonly rule: string
	readonly flags?: string
}

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

export const regexImplementation = implementNode<RegexDeclaration>({
	kind: "regex",
	collapsibleKey: "rule",
	keys: {
		rule: {},
		flags: {}
	},
	normalize: schema =>
		typeof schema === "string" ? { rule: schema }
		: schema instanceof RegExp ?
			schema.flags ?
				{ rule: schema.source, flags: schema.flags }
			:	{ rule: schema.source }
		:	schema,
	hasAssociatedError: true,
	intersectionIsOpen: true,
	intersections: {
		// for now, non-equal regex are naively intersected
		regex: () => null
	},
	defaults: {
		description: node => `matched by ${node.rule}`
	}
})

export class RegexNode extends RawPrimitiveConstraint<RegexDeclaration> {
	readonly instance = new RegExp(this.rule, this.flags)
	readonly expression = `${this.instance}`
	traverseAllows = this.instance.test.bind(this.instance)

	readonly compiledCondition = `${this.expression}.test(data)`
	readonly compiledNegation = `!${this.compiledCondition}`
	readonly impliedBasis = this.$.keywords.string.raw
}
