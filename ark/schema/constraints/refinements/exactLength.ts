import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import {
	type NodeAttachments,
	type PrimitiveAttachments,
	derivePrimitiveAttachments,
	implementNode
} from "../../shared/implement.js"
import type { RawConstraint } from "../constraint.js"
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
		exactLength: (l, r, $) =>
			new Disjoint({
				"[length]": {
					unit: {
						l: $.node("unit", { unit: l.rule }),
						r: $.node("unit", { unit: r.rule })
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
	},
	construct: (self) => {
		return derivePrimitiveAttachments<ExactLengthDeclaration>({
			compiledCondition: `data.length === ${self.rule}`,
			compiledNegation: `data.length !== ${self.rule}`,
			impliedBasis: self.$.keywords.lengthBoundable,
			expression: `{ length: ${self.rule} }`,
			traverseAllows: (data) => data.length === self.rule
		})
	}
})

export type ExactLengthNode = RawConstraint<ExactLengthDeclaration>
