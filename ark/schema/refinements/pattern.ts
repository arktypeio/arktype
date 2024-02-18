import { appendUnique } from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { throwInvalidOperandError } from "../shared/implement.js"
import { BasePrimitiveRefinement, type FoldInput } from "./refinement.js"

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
	open: true
	prerequisite: string
	expectedContext: PatternInner
}>

export class PatternNode extends BasePrimitiveRefinement<
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
		defaults: {
			description(inner) {
				return `matched by ${inner.source}`
			}
		}
	})

	readonly hasOpenIntersection = true
	regex = new RegExp(this.source, this.flags)
	traverseAllows = this.regex.test

	compiledCondition = `/${this.source}/${this.flags ?? ""}.test(${jsData})`
	compiledNegation = `!${this.compiledCondition}`

	readonly expectedContext = Object.freeze({
		...this.inner,
		code: "pattern",
		description: this.description
	})

	intersectOwnInner(r: PatternNode) {
		// For now, non-equal regex are naively intersected
		return null
	}

	foldIntersection(into: FoldInput<"pattern">): undefined {
		if (into.basis?.domain !== "string") {
			throwInvalidOperandError("pattern", "a string", into.basis)
		}
		into.pattern = appendUnique(into.pattern, this)
	}
}
