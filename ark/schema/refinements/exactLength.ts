import { RawPrimitiveConstraint } from "../constraint.js"
import type { MutableIntersectionInner } from "../roots/intersection.js"
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
		}
	})

export class ExactLengthNode extends RawPrimitiveConstraint<ExactLengthDeclaration> {
	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length === this.rule

	readonly compiledCondition: string = `data.length === ${this.rule}`
	readonly compiledNegation: string = `data.length !== ${this.rule}`
	readonly impliedBasis: BaseRoot = this.$.keywords.lengthBoundable.raw
	readonly expression: string = `{ length: ${this.rule} }`

	reduceIntersection(
		acc: MutableIntersectionInner
	): MutableIntersectionInner | Disjoint {
		if (acc.exactLength) {
			if (this.equals(acc.exactLength)) return acc
			return new Disjoint({
				"[length]": {
					unit: {
						l: this.$.node("unit", { unit: acc.exactLength.rule }),
						r: this.$.node("unit", { unit: this.rule })
					}
				}
			})
		} else acc.exactLength = this
		if (acc.minLength) {
			if (
				this.rule < acc.minLength.rule ||
				(acc.minLength.exclusive && this.rule === acc.minLength.rule)
			)
				return Disjoint.from("range", this, acc.minLength)
			delete acc.minLength
		}
		if (acc.maxLength) {
			if (
				this.rule > acc.maxLength.rule ||
				(acc.maxLength.exclusive && this.rule === acc.maxLength.rule)
			)
				return Disjoint.from("range", this, acc.maxLength)
			delete acc.maxLength
		}
		return acc
	}
}
