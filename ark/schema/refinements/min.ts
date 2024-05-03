import type { BaseRoot } from "../roots/root.js"
import type { declareNode } from "../shared/declare.js"
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

export interface MinInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMinRoot extends BaseNormalizedRangeRoot {
	rule: number
}

export type MinRoot = NormalizedMinRoot | number

export interface MinDeclaration
	extends declareNode<{
		kind: "min"
		schema: MinRoot
		normalizedSchema: NormalizedMinRoot
		inner: MinInner
		prerequisite: number
		errorContext: MinInner
	}> {}

export const minImplementation: nodeImplementationOf<MinDeclaration> =
	implementNode<MinDeclaration>({
		kind: "min",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		intersections: {
			min: (l, r) => (l.isStricterThan(r) ? l : r)
		},
		defaults: {
			description: node =>
				`${node.exclusive ? "more than" : "at least"} ${node.rule}`
		}
	})

export class MinNode extends BaseRange<MinDeclaration> {
	readonly impliedBasis: BaseRoot = this.$.keywords.number.raw

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data > this.rule : data => data >= this.rule
}
