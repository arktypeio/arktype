import type { BaseRoot } from "../roots/root.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { BaseRange, parseDateLimit, type LimitSchemaValue } from "./range.js"

export interface AfterInner extends BaseMeta {
	rule: Date
}

export interface NormalizedAfterSchema extends BaseMeta {
	rule: LimitSchemaValue
}

export type AfterSchema = NormalizedAfterSchema | LimitSchemaValue

export interface AfterDeclaration
	extends declareNode<{
		kind: "after"
		schema: AfterSchema
		normalizedSchema: NormalizedAfterSchema
		inner: AfterInner
		prerequisite: Date
		errorContext: AfterInner
	}> {}

export const afterImplementation: nodeImplementationOf<AfterDeclaration> =
	implementNode<AfterDeclaration>({
		kind: "after",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {
				parse: parseDateLimit,
				serialize: schema => schema.toISOString()
			}
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
			description: node => `after ${node.stringLimit}`,
			actual: data => data.toLocaleString()
		},
		intersections: {
			after: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})

export class AfterNode extends BaseRange<AfterDeclaration> {
	impliedBasis: BaseRoot = this.$.keywords.Date.raw

	traverseAllows: TraverseAllows<Date> = data => data >= this.rule
}
