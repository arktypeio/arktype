import { compileSerializedValue } from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { TraversalContext } from "../shared/context.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import type { of } from "./ast.js"
import { BasePrimitiveConstraint } from "./constraint.js"

export interface PredicateInner<rule extends Predicate<any> = Predicate<any>>
	extends BaseMeta {
	readonly predicate: rule
}

export type NormalizedPredicateSchema = PredicateInner

export type predicate = { ":": true }

export type PredicateSchema = NormalizedPredicateSchema | Predicate<any>

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	schema: PredicateSchema
	normalizedSchema: NormalizedPredicateSchema
	inner: PredicateInner
	intersectionIsOpen: true
	errorContext: {}
}>

// TODO: If node contains a predicate reference that doesn't take 1 arg, we need
// to wrap it with traversal state for allows

export class PredicateNode extends BasePrimitiveConstraint<PredicateDeclaration> {
	static implementation = this.implement({
		hasAssociatedError: true,
		collapsibleKey: "predicate",
		keys: {
			predicate: {}
		},
		normalize: (schema) =>
			typeof schema === "function" ? { predicate: schema } : schema,
		defaults: {
			description(node) {
				return `valid according to ${
					node.predicate.name || "an anonymous predicate"
				}`
			}
		},
		intersectionIsOpen: true,
		// TODO: ordering
		intersections: {
			// TODO: allow changed order to be the same type
			// as long as the narrows in l and r are individually safe to check
			// in the order they're specified, checking them in the order
			// resulting from this intersection should also be safe.
			predicate: () => null
		}
	})

	traverseAllows = this.predicate

	readonly impliedBasis = undefined
	readonly serializedPredicate = compileSerializedValue(this.predicate)
	readonly compiledCondition = `${this.serializedPredicate}(${jsData})`
	readonly compiledNegation = `!${this.compiledCondition}`
	readonly errorContext = this.createErrorContext({})
	readonly expression = this.serializedPredicate
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
	? // TODO: preserve constraints
	  of<narrowed> & { ":": true }
	: In
