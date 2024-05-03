import { RawPrimitiveConstraint } from "../constraint.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { implementNode } from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import type { LengthBoundableData } from "./range.js"

export interface ExactLengthInner extends BaseMeta {
	readonly rule: number
}

export type NormalizedExactLengthSchema = ExactLengthInner

export type ExactLengthSchema = NormalizedExactLengthSchema | number

export type ExactLengthDeclaration = declareNode<{
	kind: "exactLength"
	schema: ExactLengthSchema
	normalizedSchema: NormalizedExactLengthSchema
	inner: ExactLengthInner
	prerequisite: LengthBoundableData
	errorContext: ExactLengthInner
}>

export const exactLengthImplementation = implementNode<ExactLengthDeclaration>({
	kind: "exactLength",
	collapsibleKey: "rule",
	keys: {
		rule: {}
	},
	normalize: schema => (typeof schema === "number" ? { rule: schema } : schema),
	intersections: {
		exactLength: (l, r, ctx) =>
			new Disjoint({
				"[length]": {
					unit: {
						l: ctx.$.node("unit", { unit: l.rule }),
						r: ctx.$.node("unit", { unit: r.rule })
					}
				}
			}),
		minLength: (exactLength, minLength) =>
			(
				minLength.exclusive ?
					exactLength.rule > minLength.rule
				:	exactLength.rule >= minLength.rule
			) ?
				exactLength
			:	Disjoint.from("range", exactLength, minLength),
		maxLength: (exactLength, maxLength) =>
			(
				maxLength.exclusive ?
					exactLength.rule < maxLength.rule
				:	exactLength.rule <= maxLength.rule
			) ?
				exactLength
			:	Disjoint.from("range", exactLength, maxLength)
	},
	hasAssociatedError: true,
	defaults: {
		description: node => `exactly length ${node.rule}`
	}
})

export class ExactLengthNode extends RawPrimitiveConstraint<ExactLengthDeclaration> {
	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length === this.rule

	readonly compiledCondition = `data.length === ${this.rule}`
	readonly compiledNegation = `data.length !== ${this.rule}`
	readonly impliedBasis = this.$.keywords.lengthBoundable.raw
	readonly expression = `{ length: ${this.rule} }`
}
