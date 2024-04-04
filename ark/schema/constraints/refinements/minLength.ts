import { implementNode } from "../../base.js"
import { internalKeywords } from "../../keywords/internal.js"
import type { declareNode } from "../../shared/declare.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LengthBoundableData
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
	normalize: (def) => (typeof def === "number" ? { rule: def } : def),
	defaults: {
		description: (node) =>
			node.exclusive
				? node.rule === 0
					? "non-empty"
					: `more than length ${node.rule}`
				: node.rule === 1
					? "non-empty"
					: `at least length ${node.rule}`,
		actual: (data) => `${data.length}`
	},
	intersections: {
		minLength: (l, r) => (l.isStricterThan(r) ? l : r)
	}
})

export class MinLengthNode extends BaseRange<MinLengthDeclaration> {
	static implementation: nodeImplementationOf<MinLengthDeclaration> =
		minLengthImplementation

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length > this.rule
		: (data: LengthBoundableData) => data.length >= this.rule

	readonly impliedBasis = internalKeywords.lengthBoundable
}
