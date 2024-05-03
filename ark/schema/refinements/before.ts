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
	type LimitRootValue,
	parseDateLimit,
	parseExclusiveKey
} from "./range.js"

export interface BeforeInner extends BaseRangeInner {
	rule: Date
}

export interface NormalizedBeforeSchema extends BaseNormalizedRangeRoot {
	rule: LimitRootValue
}

export type BeforeSchema = NormalizedBeforeSchema | LimitRootValue

export interface BeforeDeclaration
	extends declareNode<{
		kind: "before"
		schema: BeforeSchema
		normalizedSchema: NormalizedBeforeSchema
		inner: BeforeInner
		prerequisite: Date
		errorContext: BeforeInner
	}> {}

export const beforeImplementation: nodeImplementationOf<BeforeDeclaration> =
	implementNode<BeforeDeclaration>({
		kind: "before",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {
				parse: parseDateLimit,
				serialize: schema => schema.toISOString()
			},
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			(
				typeof schema === "number" ||
				typeof schema === "string" ||
				schema instanceof Date
			) ?
				{ rule: schema }
			:	schema,
		defaults: {
			description: node =>
				node.exclusive ?
					`before ${node.stringLimit}`
				:	`${node.stringLimit} or earlier`,
			actual: data => data.toLocaleString()
		}
	})

export class BeforeNode extends BaseRange<BeforeDeclaration> {
	traverseAllows: TraverseAllows<Date> =
		this.exclusive ? data => data < this.rule : data => data <= this.rule

	impliedBasis: BaseRoot = this.$.keywords.Date.raw

	reduceIntersection(
		acc: MutableIntersectionInner
	): MutableIntersectionInner | Disjoint | UnitNode {
		if (acc.before) {
			if (this.isStricterThan(acc.before)) acc.before = this
			else return acc
		}
		if (acc.after) {
			if (this.overlapsRange(acc.after)) {
				if (this.overlapIsUnit(acc.after))
					return this.$.node("unit", { unit: this.rule })
			} else return Disjoint.from("range", this, acc.after)
		}
		return acc
	}
}
