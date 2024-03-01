import { appendUnique } from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { throwInvalidOperandError } from "../shared/implement.js"
import {
	BasePrimitiveConstraint,
	type FoldBranch,
	type FoldState
} from "./constraint.js"

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
		defaults: {
			description(inner) {
				return `matched by ${inner.source}`
			}
		},
		// for now, non-equal regex are naively intersected
		intersectSymmetric: () => null
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

	fold(into: FoldBranch<"pattern">) {
		if (into.basis?.domain !== "string") {
			throwInvalidOperandError("pattern", "a string", into.basis)
		}
		into.pattern = appendUnique(into.pattern, this)
	}

	foldIntersection(s: FoldState<"pattern">) {
		return s.map(this)
	}
}
