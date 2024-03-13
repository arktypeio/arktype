import { jsData } from "../../shared/compile.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import {
	defineNode,
	derivePrimitiveAttachments,
	type PrimitiveAttachments
} from "../../shared/implement.js"
import { type PrimitiveConstraintInner } from "../constraint.js"
import type { LengthBoundableData } from "./range.js"

export interface LengthInner extends PrimitiveConstraintInner<number> {}

export type length<n extends number> = { "==": n }

export type NormalizedLengthSchema = LengthInner

export type LengthSchema = NormalizedLengthSchema | number

export interface LengthAttachments
	extends PrimitiveAttachments<LengthDeclaration> {}

export type LengthDeclaration = declareNode<{
	kind: "length"
	schema: LengthSchema
	normalizedSchema: NormalizedLengthSchema
	inner: LengthInner
	prerequisite: LengthBoundableData
	errorContext: LengthInner
	attachments: LengthAttachments
}>

export const lengthImplementation = defineNode<LengthDeclaration>({
	collapseKey: "rule",
	keys: {
		rule: {}
	},
	normalize: (schema) =>
		typeof schema === "number" ? { rule: schema } : schema,
	intersections: {
		length: (l, r) =>
			new Disjoint({
				"[length]": {
					unit: {
						l: l.$.parseScema("unit", { unit: l.rule }),
						r: r.$.parseScema("unit", { unit: r.rule })
					}
				}
			}),
		minLength: (length, minLength) =>
			(
				minLength.exclusive
					? length.rule > minLength.rule
					: length.rule >= minLength.rule
			)
				? length
				: Disjoint.from("range", length, minLength),
		maxLength: (length, maxLength) =>
			(
				maxLength.exclusive
					? length.rule < maxLength.rule
					: length.rule <= maxLength.rule
			)
				? length
				: Disjoint.from("range", length, maxLength)
	},
	hasAssociatedError: true,
	defaults: {
		description(node) {
			return `exactly length ${node.rule}`
		}
	},
	attach: derivePrimitiveAttachments((base) => {
		const description = `exactly length ${base.rule}`
		return {
			description,
			expression: `{ length: ${base.rule}}`,
			traverseAllows: (data: LengthBoundableData) => data.length === base.rule,
			compiledCondition: `${jsData}.length === ${base.rule}`,
			compiledNegation: `${jsData}.length !== ${base.rule}`,
			impliedBasis: base.$.lengthBoundable,
			errorContext: {
				code: "length",
				description,
				...base.inner
			}
		}
	})
})
