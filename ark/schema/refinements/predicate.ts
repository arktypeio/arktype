import type { declareNode, withBaseMeta } from "../shared/declare.js"
import type { TraversalContext } from "../traversal/context.js"
import type { ArkErrors } from "../traversal/errors.js"
import { compileSerializedValue } from "../traversal/registry.js"
import { BaseRefinement } from "./refinement.js"

export type PredicateInner<predicate extends Predicate<any> = Predicate<any>> =
	withBaseMeta<{
		readonly predicate: predicate
	}>

export type NormalizedPredicateSchema = PredicateInner

export type PredicateSchema = NormalizedPredicateSchema | Predicate<any>

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	schema: PredicateSchema
	normalizedSchema: NormalizedPredicateSchema
	inner: PredicateInner
	intersections: {
		predicate: "predicate" | null
	}
	data: unknown
	expectedContext: { expected: string }
}>

// TODO: If node contains a predicate reference that doesn't take 1 arg, we need
// to wrap it with traversal state for allows

export class PredicateNode extends BaseRefinement<
	PredicateDeclaration,
	typeof PredicateNode
> {
	static implementation = this.implement({
		hasAssociatedError: true,
		collapseKey: "predicate",
		keys: {
			predicate: {}
		},
		normalize: (schema) =>
			typeof schema === "function" ? { predicate: schema } : schema,
		intersections: {
			// TODO: allow changed order to be the same type
			// as long as the narrows in l and r are individually safe to check
			// in the order they're specified, checking them in the order
			// resulting from this intersection should also be safe.
			predicate: () => null
		},
		defaults: {
			description(inner) {
				return `valid according to ${inner.predicate.name}`
			},
			expected(_source) {
				return `valid`
			}
		}
	})

	readonly hasOpenIntersection = true
	traverseAllows = this.predicate
	compiledCondition = `${compileSerializedValue(this.predicate)}(${
		this.$.dataArg
	})`
	compiledNegation = `!${this.compiledCondition}`

	getCheckedDefinitions() {
		return [{}] as const
	}
}

export type Predicate<data = unknown> = (
	data: data,
	ctx: TraversalContext
) => boolean

export type PredicateCast<input = never, narrowed extends input = input> = (
	input: input,
	errors: ArkErrors
) => input is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
