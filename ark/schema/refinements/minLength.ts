import type { declareNode } from "../shared/declare.js"
import { implementNode } from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import {
	type BaseNormalizedRangeSchema,
	BaseRange,
	type BaseRangeInner,
	type LengthBoundableData,
	parseExclusiveKey
} from "./range.js"

export interface MinLengthInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMinLengthDef extends BaseNormalizedRangeSchema {
	rule: number
}

export type MinLengthDef = NormalizedMinLengthDef | number

export type MinLengthDeclaration = declareNode<{
	kind: "minLength"
	def: MinLengthDef
	normalizedDef: NormalizedMinLengthDef
	inner: MinLengthInner
	prerequisite: LengthBoundableData
	errorContext: MinLengthInner
}>

export const minLengthImplementation = implementNode<MinLengthDeclaration>({
	kind: "minLength",
	collapsibleKey: "rule",
	hasAssociatedError: true,
	keys: {
		rule: {},
		exclusive: parseExclusiveKey
	},
	normalize: def => (typeof def === "number" ? { rule: def } : def),
	defaults: {
		description: node =>
			node.exclusive ?
				node.rule === 0 ?
					"non-empty"
				:	`more than length ${node.rule}`
			: node.rule === 1 ? "non-empty"
			: `at least length ${node.rule}`,
		actual: data => `${data.length}`
	},
	intersections: {
		minLength: (l, r) => (l.isStricterThan(r) ? l : r)
	}
})

export class MinLengthNode extends BaseRange<MinLengthDeclaration> {
	traverseAllows: TraverseAllows<LengthBoundableData> =
		this.exclusive ?
			data => data.length > this.rule
		:	data => data.length >= this.rule

	readonly impliedBasis = this.$.keywords.lengthBoundable.raw
}
