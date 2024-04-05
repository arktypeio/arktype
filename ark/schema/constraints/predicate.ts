import { compileSerializedValue } from "@arktype/util"
import { type BaseAttachments, type BaseNode, implementNode } from "../base.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import type { PrimitiveAttachments } from "../shared/implement.js"
import type { TraversalContext } from "../shared/traversal.js"
import type { constrain, of } from "./ast.js"
import type { ConstraintAttachments } from "./constraint.js"

export interface PredicateInner<rule extends Predicate<any> = Predicate<any>>
	extends BaseMeta {
	readonly predicate: rule
}

export type NormalizedPredicateDef = PredicateInner

export type PredicateDef = NormalizedPredicateDef | Predicate<any>

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	def: PredicateDef
	normalizedDef: NormalizedPredicateDef
	inner: PredicateInner
	intersectionIsOpen: true
	errorContext: {}
	attachments: PredicateAttachments
}>

export interface PredicateAttachments
	extends BaseAttachments<PredicateDeclaration>,
		PrimitiveAttachments<PredicateDeclaration>,
		ConstraintAttachments {
	serializedPredicate: string
}

// TODO: If node contains a predicate reference that doesn't take 1 arg, we need
// to wrap it with traversal state for allows

export const predicateImplementation = implementNode<PredicateDeclaration>({
	kind: "predicate",
	hasAssociatedError: true,
	collapsibleKey: "predicate",
	keys: {
		predicate: {}
	},
	normalize: (def) => (typeof def === "function" ? { predicate: def } : def),
	defaults: {
		description: (node) =>
			`valid according to ${
				node.predicate.name || "an anonymous predicate"
			}`
	},
	intersectionIsOpen: true,
	// TODO: ordering
	intersections: {
		// TODO: allow changed order to be the same type
		// as long as the narrows in l and r are individually safe to check
		// in the order they're specified, checking them in the order
		// resulting from this intersection should also be safe.
		predicate: () => null
	},
	construct: (self) => {
		const serializedPredicate = compileSerializedValue(self.predicate)
		const compiledCondition = `${serializedPredicate}(data, ctx)`
		const compiledNegation = `!${compiledCondition}`
		return {
			impliedBasis: null,
			serializedPredicate,
			compiledCondition,
			compiledNegation,
			expression: serializedPredicate,
			traverseAllows: self.predicate,
			errorContext: {
				code: "predicate",
				description: self.description
			},
			traverseApply(data, ctx) {
				if (!this.predicate(data, ctx) && !ctx.hasError())
					ctx.error(this.errorContext)
			},
			compile(js) {
				if (js.traversalKind === "Allows") {
					js.return(this.compiledCondition)
					return
				}
				js.if(`${this.compiledNegation} && !ctx.hasError()`, () =>
					js.line(`ctx.error(${this.compiledErrorContext})`)
				)
			}
		}
	}
})

export type PredicateNode = BaseNode<unknown, PredicateDeclaration>

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
	? In extends of<unknown, infer constraints>
		? constrain<of<narrowed, constraints>, "predicate", any>
		: constrain<narrowed, "predicate", any>
	: constrain<In, "predicate", any>
