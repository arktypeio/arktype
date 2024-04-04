import { implementNode } from "../../base.js"
import { tsKeywords } from "../../keywords/tsKeywords.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { BasePrimitiveConstraint } from "../constraint.js"

export interface RegexInner extends BaseMeta {
	readonly rule: string
	readonly flags?: string
}

export type NormalizedRegexDef = RegexInner

export type RegexDef = NormalizedRegexDef | string | RegExp

export type RegexDeclaration = declareNode<{
	kind: "regex"
	def: RegexDef
	normalizedDef: NormalizedRegexDef
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
	normalize: (def) =>
		typeof def === "string"
			? { rule: def }
			: def instanceof RegExp
			? def.flags
				? { rule: def.source, flags: def.flags }
				: { rule: def.source }
			: def,
	hasAssociatedError: true,
	intersectionIsOpen: true,
	intersections: {
		// for now, non-equal regex are naively intersected
		regex: () => null
	},
	defaults: {
		description: (node) => `matched by ${node.rule}`
	}
})

export class RegexNode extends BasePrimitiveConstraint<RegexDeclaration> {
	static implementation = regexImplementation

	readonly instance = new RegExp(this.rule, this.flags)
	readonly expression = `${this.instance}`
	traverseAllows = this.instance.test.bind(this.instance)

	readonly compiledCondition = `${this.expression}.test(data)`
	readonly compiledNegation = `!${this.compiledCondition}`
	readonly impliedBasis = tsKeywords.string
	readonly errorContext = this.createErrorContext(this.inner)
}
