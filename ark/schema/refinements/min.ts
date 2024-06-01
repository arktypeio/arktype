import type { BaseRoot } from "../roots/root.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { BaseRange, parseExclusiveKey } from "./range.js"

export interface MinInner extends BaseMeta {
	rule: number
	exclusive?: true
}

export interface NormalizedMinSchema extends BaseMeta {
	rule: number
	exclusive?: boolean
}

export type MinSchema = NormalizedMinSchema | number

export interface MinDeclaration
	extends declareNode<{
		kind: "min"
		schema: MinSchema
		normalizedSchema: NormalizedMinSchema
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
		defaults: {
			description: node =>
				`${node.exclusive ? "more than" : "at least"} ${node.rule}`
		},
		intersections: {
			min: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})

export class MinNode extends BaseRange<MinDeclaration> {
	readonly impliedBasis: BaseRoot = this.$.keywords.number.raw

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data > this.rule : data => data >= this.rule
}
