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
	minLength: number
}

export interface NormalizedMinLengthSchema extends BaseNormalizedRangeSchema {
	minLength: number
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
			collapsibleKey: "minLength",
			hasAssociatedError: true,
			keys: {
				minLength: {},
				exclusive: parseExclusiveKey
			},
			normalize: (schema) =>
				typeof schema === "number" ? { minLength: schema } : schema,
			defaults: {
				description(node) {
					return node.exclusive
						? node.limit === 0
							? "non-empty"
							: `more than length ${node.limit}`
						: node.limit === 1
						? "non-empty"
						: `at least length ${node.limit}`
				},
				actual: (data) => `${data.length}`
			},
			intersections: {
				minLength: (l, r) => (l.isStricterThan(r) ? l : r)
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length > this.limit
		: (data: LengthBoundableData) => data.length >= this.limit

	readonly impliedBasis = this.$.lengthBoundable
}
