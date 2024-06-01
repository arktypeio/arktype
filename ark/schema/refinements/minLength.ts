import type { BaseRoot } from "../roots/root.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { BaseRange, type LengthBoundableData } from "./range.js"

export interface MinLengthInner extends BaseMeta {
	rule: number
}

export interface NormalizedMinLengthSchema extends BaseMeta {
	rule: number
}

export type MinLengthSchema = NormalizedMinLengthSchema | number

export interface MinLengthDeclaration
	extends declareNode<{
		kind: "minLength"
		schema: MinLengthSchema
		normalizedSchema: NormalizedMinLengthSchema
		inner: MinLengthInner
		prerequisite: LengthBoundableData
		errorContext: MinLengthInner
	}> {}

export const minLengthImplementation: nodeImplementationOf<MinLengthDeclaration> =
	implementNode<MinLengthDeclaration>({
		kind: "minLength",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {}
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: {
			description: node =>
				node.rule === 1 ? "non-empty" : `at least length ${node.rule}`,
			actual: data => `${data.length}`
		},
		intersections: {
			minLength: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})

export class MinLengthNode extends BaseRange<MinLengthDeclaration> {
	readonly impliedBasis: BaseRoot = this.$.keywords.lengthBoundable.raw

	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length >= this.rule
}
