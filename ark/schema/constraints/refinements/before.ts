import { jsObjects } from "../../keywords/jsObjects.js"
import { node } from "../../parser/parse.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import {
	BaseRange,
	parseDateLimit,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LimitSchemaValue
} from "./range.js"

export interface BeforeInner extends BaseRangeInner {
	rule: Date
}

export interface NormalizedBeforeDef extends BaseNormalizedRangeSchema {
	rule: LimitSchemaValue
}

export type BeforeDef = NormalizedBeforeDef | LimitSchemaValue

export type BeforeDeclaration = declareNode<{
	kind: "before"
	def: BeforeDef
	normalizedDef: NormalizedBeforeDef
	inner: BeforeInner
	prerequisite: Date
	errorContext: BeforeInner
}>

export class BeforeNode extends BaseRange<BeforeDeclaration> {
	static implementation: nodeImplementationOf<BeforeDeclaration> =
		this.implement({
			kind: "before",
			collapsibleKey: "rule",
			hasAssociatedError: true,
			keys: {
				rule: {
					parse: parseDateLimit,
					serialize: (def) => def.toISOString()
				},
				exclusive: parseExclusiveKey
			},
			normalize: (def) =>
				typeof def === "number" ||
				typeof def === "string" ||
				def instanceof Date
					? { rule: def }
					: def,
			defaults: {
				description(node) {
					return node.exclusive
						? `before ${node.stringLimit}`
						: `${node.stringLimit} or earlier`
				},
				actual: (data) => data.toLocaleString()
			},
			intersections: {
				before: (l, r) => (l.isStricterThan(r) ? l : r),
				after: (before, after) =>
					before.overlapsRange(after)
						? before.overlapIsUnit(after)
							? node("unit", { unit: before.rule })
							: null
						: Disjoint.from("range", before, after)
			}
		})

	readonly impliedBasis = jsObjects.Date

	traverseAllows: TraverseAllows<Date> = this.exclusive
		? (data) => +data < this.numericLimit
		: (data) => +data <= this.numericLimit
}
