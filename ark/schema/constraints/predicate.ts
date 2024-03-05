import { compileSerializedValue } from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { TraversalContext } from "../shared/context.js"
import type { declareNode } from "../shared/declare.js"
import { BasePrimitiveConstraint, type ConstraintInner } from "./constraint.js"
import type { is } from "./is.js"

export interface PredicateInner<rule extends Predicate<any> = Predicate<any>>
	extends ConstraintInner<rule> {}

export type NormalizedPredicateSchema = PredicateInner

export type PredicateSchema = NormalizedPredicateSchema | Predicate<any>

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	schema: PredicateSchema
	normalizedSchema: NormalizedPredicateSchema
	inner: PredicateInner
	composition: "primitive"
	hasOpenIntersection: true
	expectedContext: {}
}>

// TODO: If node contains a predicate reference that doesn't take 1 arg, we need
// to wrap it with traversal state for allows

export class PredicateNode extends BasePrimitiveConstraint<
	PredicateDeclaration,
	typeof PredicateNode
> {
	static implementation = this.implement({
		hasAssociatedError: true,
		collapseKey: "rule",
		keys: {
			rule: {}
		},
		normalize: (schema) =>
			typeof schema === "function" ? { rule: schema } : schema,
		defaults: {
			description(inner) {
				return `valid according to ${inner.rule.name}`
			}
		},
		hasOpenIntersection: true,
		intersections: {
			// TODO: allow changed order to be the same type
			// as long as the narrows in l and r are individually safe to check
			// in the order they're specified, checking them in the order
			// resulting from this intersection should also be safe.
			predicate: () => null
		}
	})

	traverseAllows = this.rule
	compiledCondition = `${compileSerializedValue(this.rule)}(${jsData})`
	compiledNegation = `!${this.compiledCondition}`
	expectedContext = this.createExpectedContext({ expected: this.description })
}

export type Predicate<data = unknown> = (
	data: data,
	ctx: TraversalContext
) => boolean

export type PredicateCast<input = never, narrowed extends input = input> = (
	input: input,
	ctx: TraversalContext
) => input is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? is<narrowed, { anonymousPredicate: true }>
	: In
