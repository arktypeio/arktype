import type { MutableIntersectionInner } from "../roots/intersection.js"
import type { BaseRoot } from "../roots/root.js"
import type { UnitNode } from "../roots/unit.js"
import type { declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import {
	type BaseNormalizedRangeRoot,
	BaseRange,
	type BaseRangeInner,
	type LengthBoundableData,
	parseExclusiveKey
} from "./range.js"

export interface MaxLengthInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMaxLengthSchema extends BaseNormalizedRangeRoot {
	rule: number
}

export type MaxLengthSchema = NormalizedMaxLengthSchema | number

export interface MaxLengthDeclaration
	extends declareNode<{
		kind: "maxLength"
		schema: MaxLengthSchema
		normalizedSchema: NormalizedMaxLengthSchema
		inner: MaxLengthInner
		prerequisite: LengthBoundableData
		errorContext: MaxLengthInner
	}> {}

export const maxLengthImplementation: nodeImplementationOf<MaxLengthDeclaration> =
	implementNode<MaxLengthDeclaration>({
		kind: "maxLength",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: {
			description: node =>
				node.exclusive ?
					`less than length ${node.rule}`
				:	`at most length ${node.rule}`,
			actual: data => `${data.length}`
		}
	})

export class MaxLengthNode extends BaseRange<MaxLengthDeclaration> {
	readonly impliedBasis: BaseRoot = this.$.keywords.lengthBoundable.raw

	traverseAllows: TraverseAllows<LengthBoundableData> =
		this.exclusive ?
			data => data.length < this.rule
		:	data => data.length <= this.rule

	reduceIntersection(
		acc: MutableIntersectionInner
	): MutableIntersectionInner | Disjoint | UnitNode {
		if (acc.maxLength) {
			if (this.isStricterThan(acc.maxLength)) acc.maxLength = this
			else return acc
		}
		if (acc.minLength) {
			if (this.overlapsRange(acc.minLength)) {
				if (this.overlapIsUnit(acc.minLength))
					acc.exactLength = this.$.node("exactLength", { rule: this.rule })
			} else return Disjoint.from("range", this, acc.minLength)
		}
		return acc
	}
}
