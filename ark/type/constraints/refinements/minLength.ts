import type { declareNode } from "../../shared/declare.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LengthBoundableData,
	type boundToIs
} from "./range.js"

export type minLength<n extends number> = boundToIs<"minLength", n>

export interface MinLengthInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMinLengthSchema extends BaseNormalizedRangeSchema {
	rule: number
}

export type MinLengthSchema = NormalizedMinLengthSchema | number

export type MinLengthDeclaration = declareNode<{
	kind: "minLength"
	schema: MinLengthSchema
	normalizedSchema: NormalizedMinLengthSchema
	inner: MinLengthInner
	prerequisite: LengthBoundableData
	errorContext: MinLengthInner
}>

export class MinLengthNode extends BaseRange<MinLengthDeclaration> {
	static implementation: nodeImplementationOf<MinLengthDeclaration> =
		this.implement({
			collapsibleKey: "rule",
			hasAssociatedError: true,
			keys: {
				rule: {},
				exclusive: parseExclusiveKey
			},
			normalize: (schema) =>
				typeof schema === "number" ? { rule: schema } : schema,
			defaults: {
				description(node) {
					return node.exclusive
						? node.rule === 0
							? "non-empty"
							: `more than length ${node.rule}`
						: node.rule === 1
						? "non-empty"
						: `at least length ${node.rule}`
				},
				actual: (data) => `${data.length}`
			},
			intersections: {
				minLength: (l, r) => (l.isStricterThan(r) ? l : r)
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length > this.rule
		: (data: LengthBoundableData) => data.length >= this.rule

	readonly impliedBasis = this.$.keywords.lengthBoundable
}
