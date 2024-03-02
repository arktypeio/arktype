import { appendUnique, compileSerializedValue } from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { TraversalContext } from "../shared/context.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import type { is } from "../shared/utils.js"
import { BasePrimitiveConstraint, type FoldInput } from "./constraint.js"

export interface PredicateInner<
	predicate extends Predicate<any> = Predicate<any>
> extends BaseMeta {
	readonly predicate: predicate
}

export type NormalizedPredicateSchema = PredicateInner

export type PredicateSchema = NormalizedPredicateSchema | Predicate<any>

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	schema: PredicateSchema
	normalizedSchema: NormalizedPredicateSchema
	inner: PredicateInner
	composition: "primitive"
	open: true
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
		collapseKey: "predicate",
		keys: {
			predicate: {}
		},
		normalize: (schema) =>
			typeof schema === "function" ? { predicate: schema } : schema,
		defaults: {
			description(inner) {
				return `valid according to ${inner.predicate.name}`
			}
		},
		// TODO: allow changed order to be the same type
		// as long as the narrows in l and r are individually safe to check
		// in the order they're specified, checking them in the order
		// resulting from this intersection should also be safe.
		intersectSymmetric: () => null
	})

	traverseAllows = this.predicate
	compiledCondition = `${compileSerializedValue(this.predicate)}(${jsData})`
	compiledNegation = `!${this.compiledCondition}`
	expectedContext = this.createExpectedContext({ expected: this.description })

	foldIntersection(into: FoldInput<"predicate">): undefined {
		into.predicate = appendUnique(into.predicate, this)
	}
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
