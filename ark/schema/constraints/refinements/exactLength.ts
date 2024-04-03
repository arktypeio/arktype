import { internalKeywords } from "../../keywords/internal.js"
import { node } from "../../parser/parse.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import { BasePrimitiveConstraint } from "../constraint.js"
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
}>

export class ExactLengthNode extends BasePrimitiveConstraint<ExactLengthDeclaration> {
	static implementation = this.implement({
		kind: "exactLength",
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
							l: node("unit", { unit: l.rule }),
							r: node("unit", { unit: r.rule })
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

	readonly compiledCondition = `data.length === ${this.rule}`
	readonly compiledNegation = `data.length !== ${this.rule}`
	readonly impliedBasis = internalKeywords.lengthBoundable
	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = `{ length: ${this.rule} }`
}
