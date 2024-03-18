import { jsData } from "../../shared/compile.js"
import type { TraverseAllows } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { BasePrimitiveConstraint } from "../constraint.js"
import type { LengthBoundableData } from "./range.js"

export interface ExactLengthInner extends BaseMeta {
	readonly rule: number
}

export type length<n extends number> = { "==": n }

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

export class ExactLengthNode extends BasePrimitiveConstraint<ExactLengthDeclaration> {
	static implementation = this.implement({
		collapsibleKey: "rule",
		keys: {
			rule: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { rule: schema } : schema,
		intersections: {
			exactLength: (l, r) =>
				new Disjoint({
					"[length]": {
						unit: {
							l: l.$.node("unit", { unit: l.rule }),
							r: r.$.node("unit", { unit: r.rule })
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
			description(node) {
				return `exactly length ${node.rule}`
			}
		}
	})

	traverseAllows: TraverseAllows<LengthBoundableData> = (data) =>
		data.length === this.rule

	readonly compiledCondition = `${jsData}.length === ${this.rule}`
	readonly compiledNegation = `${jsData}.length !== ${this.rule}`
	readonly impliedBasis = this.$.keywords.lengthBoundable
	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = `{ length: ${this.rule} }`
}
