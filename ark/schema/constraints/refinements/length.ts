import { jsData } from "../../shared/compile.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import {
	BasePrimitiveConstraint,
	type PrimitiveConstraintInner
} from "../constraint.js"
import type { LengthBoundableData } from "./range.js"

export interface LengthInner extends PrimitiveConstraintInner<number> {}

export type length<n extends number> = { "==": n }

export type NormalizedLengthSchema = LengthInner

export type LengthSchema = NormalizedLengthSchema | number

export type LengthDeclaration = declareNode<{
	kind: "length"
	schema: LengthSchema
	normalizedSchema: NormalizedLengthSchema
	inner: LengthInner
	prerequisite: LengthBoundableData
	expectedContext: LengthInner
}>

export class LengthNode extends BasePrimitiveConstraint<
	LengthDeclaration,
	typeof LengthNode
> {
	static implementation = this.implement({
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
							l: l.$.parse("unit", { unit: l.rule }),
							r: r.$.parse("unit", { unit: r.rule })
						}
					}
				})
		},
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return `exactly length ${inner.rule}`
			}
		}
	})

	traverseAllows = (data: LengthBoundableData) => data.length === this.rule

	compiledCondition = `${jsData}.length === ${this.rule}`
	compiledNegation = `${jsData}.length !== ${this.rule}`

	readonly expectedContext = this.createExpectedContext(this.inner)
}
