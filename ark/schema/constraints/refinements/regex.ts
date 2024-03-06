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
	prerequisite: string
	expectedContext: RegexInner
	symmetricIntersection: RegexNode | null
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
		symmetricIntersectionIsOpen: true,
		intersections: {
			// for now, non-equal regex are naively intersected
			regex: () => null
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
	// 	throwInvalidOperandError("regex", "a string", into.basis)
	// }
}
