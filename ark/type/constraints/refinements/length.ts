import { jsData } from "../../shared/compile.js"
import type { TraverseAllows } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { BasePrimitiveConstraint } from "../constraint.js"
import { lengthBoundable, type LengthBoundableData } from "./range.js"

export interface LengthInner extends BaseMeta {
	readonly rule: number
}

export type length<n extends number> = { "==": n }

export type NormalizedLengthSchema = LengthInner

export type LengthSchema = NormalizedLengthSchema | number

export type LengthDeclaration = declareNode<{
	kind: "length"
	schema: LengthSchema
	normalizedSchema: NormalizedLengthSchema
	inner: LengthInner
	prerequisite: LengthBoundableData
	errorContext: LengthInner
}>

export class LengthNode extends BasePrimitiveConstraint<LengthDeclaration> {
	static implementation = this.implement({
		collapsibleKey: "rule",
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
							l: l.$.parseSchema("unit", { unit: l.rule }),
							r: r.$.parseSchema("unit", { unit: r.rule })
						}
					}
				}),
			minLength: (length, minLength) =>
				(
					minLength.exclusive
						? length.rule > minLength.length
						: length.rule >= minLength.length
				)
					? length
					: Disjoint.from("range", length, minLength),
			maxLength: (length, maxLength) =>
				(
					maxLength.exclusive
						? length.rule < maxLength.length
						: length.rule <= maxLength.length
				)
					? length
					: Disjoint.from("range", length, maxLength)
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
	readonly impliedBasis = lengthBoundable
	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = `{ length: ${this.rule}}`
}
