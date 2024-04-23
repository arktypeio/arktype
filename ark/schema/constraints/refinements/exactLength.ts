import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import {
	implementNode,
	type NodeAttachments,
	type PrimitiveAttachments
} from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import { RawPrimitiveConstraint } from "../constraint.js"
import type { ConstraintAttachments } from "../util.js"
import type { LengthBoundableData } from "./range.js"

export interface ExactLengthInner extends BaseMeta {
	readonly rule: number
}

export type NormalizedExactLengthDef = ExactLengthInner

export type ExactLengthDef = NormalizedExactLengthDef | number

export type ExactLengthDeclaration = declareNode<{
	kind: "exactLength"
	def: ExactLengthDef
	normalizedDef: NormalizedExactLengthDef
	inner: ExactLengthInner
	prerequisite: LengthBoundableData
	errorContext: ExactLengthInner
	attachments: ExactLengthAttachments
}>

export interface ExactLengthAttachments
	extends NodeAttachments<ExactLengthDeclaration>,
		PrimitiveAttachments<ExactLengthDeclaration>,
		ConstraintAttachments {}

export const exactLengthImplementation = implementNode<ExactLengthDeclaration>({
	kind: "exactLength",
	collapsibleKey: "rule",
	keys: {
		rule: {}
	},
	normalize: (def) => (typeof def === "number" ? { rule: def } : def),
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
		description: (node) => `exactly length ${node.rule}`
	}
})

export class ExactLengthNode extends RawPrimitiveConstraint<ExactLengthDeclaration> {
	traverseAllows: TraverseAllows<LengthBoundableData> = (data) =>
		data.length === this.rule

	readonly compiledCondition = `data.length === ${this.rule}`
	readonly compiledNegation = `data.length !== ${this.rule}`
	readonly impliedBasis = this.$.keywords.lengthBoundable.raw
	readonly expression = `{ length: ${this.rule} }`
}
