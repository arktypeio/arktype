import { jsData } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { BasePrimitiveConstraint, type FoldInput } from "../constraint.js"
import type { LengthBoundableData } from "./range.js"

export interface ExactLengthInner extends BaseMeta {
	readonly length: number
}

export type NormalizedExactLengthSchema = ExactLengthInner

export type ExactLengthSchema = NormalizedExactLengthSchema | number

export type ExactLengthDeclaration = declareNode<{
	kind: "exactLength"
	schema: ExactLengthSchema
	normalizedSchema: NormalizedExactLengthSchema
	inner: ExactLengthInner
	composition: "primitive"
	prerequisite: LengthBoundableData
	expectedContext: ExactLengthInner
	disjoinable: true
}>

export class ExactLengthNode extends BasePrimitiveConstraint<
	ExactLengthDeclaration,
	typeof ExactLengthNode
> {
	static implementation = this.implement({
		collapseKey: "length",
		keys: {
			length: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { length: schema } : schema,
		intersectSymmetric: (l, r) =>
			new Disjoint({
				"[length]": {
					unit: {
						l: l.$.parse("unit", { unit: l.length }),
						r: r.$.parse("unit", { unit: r.length })
					}
				}
			}),
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return inner.length === 1
					? "an integer"
					: `a multiple of ${inner.length}`
			}
		}
	})

	traverseAllows = (data: LengthBoundableData) => data.length === this.length

	compiledCondition = `${jsData}.length === ${this.length}`
	compiledNegation = `${jsData}.length !== ${this.length}`

	readonly expectedContext = this.createExpectedContext(this.inner)

	foldIntersection(into: FoldInput<"exactLength">): undefined {}
}
