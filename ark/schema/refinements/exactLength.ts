import { $ark } from "@ark/util"
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
			description: node => `exactly length ${node.rule}`,
			actual: data => `${data.length}`
		},
		intersections: {
			exactLength: (l, r, ctx) =>
				Disjoint.init(
					"unit",
					ctx.$.node("unit", { unit: l.rule }),
					ctx.$.node("unit", { unit: r.rule }),
					{ path: ["length"] }
				),
			minLength: (exactLength, minLength) =>
				(
					minLength.exclusive ?
						exactLength.rule > minLength.rule
					:	exactLength.rule >= minLength.rule
				) ?
					exactLength
				:	Disjoint.init("range", exactLength, minLength),
			maxLength: (exactLength, maxLength) =>
				(
					maxLength.exclusive ?
						exactLength.rule < maxLength.rule
					:	exactLength.rule <= maxLength.rule
				) ?
					exactLength
				:	Disjoint.init("range", exactLength, maxLength)
		}
	})

export class ExactLengthNode extends RawPrimitiveConstraint<ExactLengthDeclaration> {
	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length === this.rule

	readonly compiledCondition: string = `data.length === ${this.rule}`
	readonly compiledNegation: string = `data.length !== ${this.rule}`
	readonly impliedBasis: BaseRoot = $ark.intrinsic.lengthBoundable.internal
	readonly expression: string = `{ length: ${this.rule} }`
}
