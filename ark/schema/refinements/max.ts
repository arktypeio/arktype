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
	parseExclusiveKey
} from "./range.js"

export interface MaxInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMaxSchema extends BaseNormalizedRangeRoot {
	rule: number
}

export type MaxSchema = NormalizedMaxSchema | number

export interface MaxDeclaration
	extends declareNode<{
		kind: "max"
		schema: MaxSchema
		normalizedSchema: NormalizedMaxSchema
		inner: MaxInner
		prerequisite: number
		errorContext: MaxInner
	}> {}

export const maxImplementation: nodeImplementationOf<MaxDeclaration> =
	implementNode<MaxDeclaration>({
		kind: "max",
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
				`${node.exclusive ? "less than" : "at most"} ${node.rule}`
		}
	})

export class MaxNode extends BaseRange<MaxDeclaration> {
	impliedBasis: BaseRoot = this.$.keywords.number.raw

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data < this.rule : data => data <= this.rule

	reduceIntersection(
		acc: MutableIntersectionInner
	): MutableIntersectionInner | Disjoint | UnitNode {
		if (acc.max) {
			if (this.isStricterThan(acc.max)) acc.max = this
			else return acc
		}
		if (acc.min) {
			if (this.overlapsRange(acc.min)) {
				if (this.overlapIsUnit(acc.min))
					return this.$.node("unit", { unit: this.rule })
			} else return Disjoint.from("range", this, acc.min)
		}
		return acc
	}
}
