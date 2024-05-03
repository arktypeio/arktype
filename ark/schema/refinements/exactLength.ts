import { RawPrimitiveConstraint } from "../constraint.js"
import type { BaseRoot } from "../roots/root.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
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

export const exactLengthImplementation: nodeImplementationOf<ExactLengthDeclaration> =
	implementNode<ExactLengthDeclaration>({
		kind: "exactLength",
		collapsibleKey: "rule",
		keys: {
			rule: {}
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		hasAssociatedError: true,
		defaults: {
			description: node => `exactly length ${node.rule}`
		},
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
		}
	})

export class ExactLengthNode extends RawPrimitiveConstraint<ExactLengthDeclaration> {
	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length === this.rule

	readonly compiledCondition: string = `data.length === ${this.rule}`
	readonly compiledNegation: string = `data.length !== ${this.rule}`
	readonly impliedBasis: BaseRoot = this.$.keywords.lengthBoundable.raw
	readonly expression: string = `{ length: ${this.rule} }`
}
