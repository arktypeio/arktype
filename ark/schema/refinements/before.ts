import type { BaseRoot } from "../roots/root.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { BaseRange, parseDateLimit, type LimitSchemaValue } from "./range.js"

export interface BeforeInner extends BaseMeta {
	rule: Date
}

export interface NormalizedBeforeSchema extends BaseMeta {
	rule: LimitSchemaValue
}

export type BeforeSchema = NormalizedBeforeSchema | LimitSchemaValue

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
			description: node => `before ${node.stringLimit}`,
			actual: data => data.toLocaleString()
		},
		intersections: {
			before: (l, r) => (l.isStricterThan(r) ? l : r),
			after: (before, after, ctx) =>
				before.overlapsRange(after) ?
					before.overlapIsUnit(after) ?
						ctx.$.node("unit", { unit: before.rule })
					:	null
				:	Disjoint.from("range", before, after)
		}
	})

export class BeforeNode extends BaseRange<BeforeDeclaration> {
	traverseAllows: TraverseAllows<Date> = data => data <= this.rule

	impliedBasis: BaseRoot = this.$.keywords.Date.raw
}
