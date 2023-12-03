import {
	In,
	compileSerializedValue,
	type Problems
} from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { RefinementNode } from "./shared.js"

export type PredicateInner<predicate extends Predicate<any> = Predicate<any>> =
	{
		readonly predicate: predicate
	}

export type NormalizedPredicateSchema = withAttributes<PredicateInner>

export type PredicateSchema = NormalizedPredicateSchema | Predicate<any>

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	schema: PredicateSchema
	inner: PredicateInner
	intersections: {
		predicate: "predicate" | null
	}
	checks: unknown
}>

// TODO: If node contains a predicate reference that doesn't take 1 arg, we need
// to wrap it with traversal state for allows

export class PredicateNode extends RefinementNode<typeof PredicateNode> {
	static declaration: PredicateDeclaration
	static parser = this.composeParser({
		kind: "predicate",
		collapseKey: "predicate",
		keys: {
			predicate: {}
		},
		normalize: (schema) =>
			typeof schema === "function" ? { predicate: schema } : schema
	})

	traverseAllows = this.predicate
	traverseApply = this.createPrimitiveTraversal()
	condition = `${compileSerializedValue(this.predicate)}(${In})`
	negatedCondition = `!${this.condition}`

	getCheckedDefinitions() {
		return [{}] as const
	}

	writeDefaultDescription() {
		return `valid according to ${this.predicate.name}`
	}
}

// intersections: {
// 	// TODO: allow changed order to be the same type
// 	// as long as the narrows in l and r are individually safe to check
// 	// in the order they're specified, checking them in the order
// 	// resulting from this intersection should also be safe.
// 	predicate: () => null
// },

// 	compile: compilePrimitive

export type Predicate<input = unknown> = (
	input: input,
	problems: Problems
) => boolean

export type PredicateCast<input = never, narrowed extends input = input> = (
	input: input,
	problems: Problems
) => input is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
