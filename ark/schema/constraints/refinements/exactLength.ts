import { type BaseAttachments, implementNode } from "../../base.js"
import { internalKeywords } from "../../keywords/internal.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import {
	type PrimitiveAttachments,
	derivePrimitiveAttachments
} from "../../shared/implement.js"
import type { BaseConstraint, ConstraintAttachments } from "../constraint.js"
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
	extends BaseAttachments<ExactLengthDeclaration>,
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
				minLength.exclusive
					? exactLength.rule > minLength.rule
					: exactLength.rule >= minLength.rule
			)
				? exactLength
				: Disjoint.from("range", exactLength, minLength),
		maxLength: (exactLength, maxLength) =>
			(
				maxLength.exclusive
					? exactLength.rule < maxLength.rule
					: exactLength.rule <= maxLength.rule
			)
				? exactLength
				: Disjoint.from("range", exactLength, maxLength)
	},
	hasAssociatedError: true,
	defaults: {
		description: (node) => `exactly length ${node.rule}`
	},
	construct: (self) => {
		return derivePrimitiveAttachments<ExactLengthDeclaration>(self, {
			compiledCondition: `data.length === ${self.rule}`,
			compiledNegation: `data.length !== ${self.rule}`,
			impliedBasis: internalKeywords.lengthBoundable,
			expression: `{ length: ${self.rule} }`,
			traverseAllows: (data) => data.length === self.rule
		})
	}
})

export type ExactLengthNode = BaseConstraint<ExactLengthDeclaration>
