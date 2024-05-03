import { registeredReference } from "@arktype/util"
import type { constrain, of } from "./ast.js"
import { BaseConstraint } from "./constraint.js"
import type { errorContext } from "./kinds.js"
import type { NodeCompiler } from "./shared/compile.js"
import type { BaseMeta, declareNode } from "./shared/declare.js"
import { implementNode } from "./shared/implement.js"
import type { TraversalContext, TraverseApply } from "./shared/traversal.js"

export interface PredicateInner<rule extends Predicate<any> = Predicate<any>>
	extends BaseMeta {
	readonly predicate: rule
}

export type PredicateErrorContext = Partial<PredicateInner>

export type NormalizedPredicateDef = PredicateInner

export type PredicateDef = NormalizedPredicateDef | Predicate<any>

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	def: PredicateDef
	normalizedDef: NormalizedPredicateDef
	inner: PredicateInner
	intersectionIsOpen: true
	errorContext: PredicateErrorContext
}>

export const predicateImplementation = implementNode<PredicateDeclaration>({
	kind: "predicate",
	hasAssociatedError: true,
	collapsibleKey: "predicate",
	keys: {
		predicate: {}
	},
	normalize: def => (typeof def === "function" ? { predicate: def } : def),
	defaults: {
		description: node =>
			`valid according to ${node.predicate.name || "an anonymous predicate"}`
	},
	intersectionIsOpen: true,
	intersections: {
		// TODO: allow changed order to be the same type
		// as long as the narrows in l and r are individually safe to check
		// in the order they're specified, checking them in the order
		// resulting from this intersection should also be safe.
		predicate: () => null
	}
})

export class PredicateNode extends BaseConstraint<PredicateDeclaration> {
	serializedPredicate = registeredReference(this.predicate)
	compiledCondition = `${this.serializedPredicate}(data, ctx)`
	compiledNegation = `!${this.compiledCondition}`

	impliedBasis = null

	expression = this.serializedPredicate
	traverseAllows = this.predicate

	errorContext: errorContext<"predicate"> = {
		code: "predicate",
		description: this.description
	}

	compiledErrorContext = `{ code: "predicate", description: "${this.description}" }`

	traverseApply: TraverseApply = (data, ctx) => {
		if (!this.predicate(data, ctx) && !ctx.hasError())
			ctx.error(this.errorContext)
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			js.return(this.compiledCondition)
			return
		}
		js.if(`${this.compiledNegation} && !ctx.hasError()`, () =>
			js.line(`ctx.error(${this.compiledErrorContext})`)
		)
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

export type inferNarrow<In, predicate> =
	predicate extends (data: any, ...args: any[]) => data is infer narrowed ?
		In extends of<unknown, infer constraints> ?
			constrain<of<narrowed, constraints>, "predicate", any>
		:	constrain<narrowed, "predicate", any>
	:	constrain<In, "predicate", any>
