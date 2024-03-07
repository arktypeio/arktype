import { jsData } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { BasePrimitiveConstraint } from "../constraint.js"

export interface RegexInner extends BaseMeta {
	readonly source: string
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
	expectedContext: RegexInner
}>

export class RegexNode extends BasePrimitiveConstraint<
	RegexDeclaration,
	typeof RegexNode
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
			regex: () => null
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
	// 	throwInvalidOperandError("regex", "a string", into.basis)
	// }
}
