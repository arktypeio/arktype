import { BaseNode } from "../base.js"
import type { declareNode, withBaseMeta } from "../shared/declare.js"
import { createBasisAssertion } from "../shared/define.js"

export type ExtraneousKeyBehavior = "throw" | "prune"

export type ExactInner = withBaseMeta<{
	readonly extraneousKeyBehavior: ExtraneousKeyBehavior
}>

export type NormalizedExactSchema = ExactInner

export type ExactSchema = NormalizedExactSchema | ExtraneousKeyBehavior

export type ExactDeclaration = declareNode<{
	kind: "exact"
	schema: ExactSchema
	normalizedSchema: NormalizedExactSchema
	inner: ExactInner
	intersections: {
		exact: "exact"
	}
	prerequisite: object
}>

export class ExactNode extends BaseNode<
	object,
	ExactDeclaration,
	typeof ExactNode
> {
	static implementation = this.implement({
		collapseKey: "extraneousKeyBehavior",
		keys: {
			extraneousKeyBehavior: {}
		},
		normalize: (schema) =>
			typeof schema === "string" ? { extraneousKeyBehavior: schema } : schema,
		intersections: {
			exact: (l, r) => ({
				extraneousKeyBehavior:
					l.extraneousKeyBehavior === "throw" ||
					r.extraneousKeyBehavior === "throw"
						? ("throw" as const)
						: ("prune" as const)
			})
		},
		hasAssociatedError: true,
		defaults: {
			description() {
				return "comprised exclusively of known keys"
			}
		}
	})

	readonly constraintGroup = "props"
	readonly hasOpenIntersection = false

	get prerequisiteSchemas() {
		return ["object"] as const
	}

	assertValidBasis = createBasisAssertion(this)
}
