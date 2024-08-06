import { BaseConstraint } from "./constraint.js"
import type { NodeCompiler } from "./shared/compile.js"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "./shared/declare.js"
import {
	compileErrorContext,
	implementNode,
	type nodeImplementationOf
} from "./shared/implement.js"
import {
	type RegisteredReference,
	registeredReference
} from "./shared/registry.js"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "./shared/traversal.js"

export namespace Predicate {
	export type Schema<predicate extends Predicate = Predicate> =
		| NormalizedSchema<predicate>
		| predicate

	export interface NormalizedSchema<predicate extends Predicate = Predicate>
		extends BaseNormalizedSchema {
		readonly predicate: predicate
	}

	export interface Inner<predicate extends Predicate = Predicate> {
		readonly predicate: predicate
	}

	export interface ErrorContext extends BaseErrorContext<"predicate"> {
		readonly predicate?: Predicate
	}

	export interface Declaration
		extends declareNode<{
			kind: "predicate"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			intersectionIsOpen: true
			errorContext: ErrorContext
		}> {}

	export type Node = PredicateNode
}

const implementation: nodeImplementationOf<Predicate.Declaration> =
	implementNode<Predicate.Declaration>({
		kind: "predicate",
		hasAssociatedError: true,
		collapsibleKey: "predicate",
		keys: {
			predicate: {}
		},
		normalize: schema =>
			typeof schema === "function" ? { predicate: schema } : schema,
		defaults: {
			description: node =>
				`valid according to ${node.predicate.name || "an anonymous predicate"}`
		},
		intersectionIsOpen: true,
		intersections: {
			// as long as the narrows in l and r are individually safe to check
			// in the order they're specified, checking them in the order
			// resulting from this intersection should also be safe.
			predicate: () => null
		}
	})

export class PredicateNode extends BaseConstraint<Predicate.Declaration> {
	serializedPredicate: RegisteredReference = registeredReference(this.predicate)
	compiledCondition = `${this.serializedPredicate}(data, ctx)`
	compiledNegation = `!${this.compiledCondition}`

	impliedBasis = null

	expression: string = this.serializedPredicate
	traverseAllows: TraverseAllows = this.predicate

	errorContext: Predicate.ErrorContext = {
		code: "predicate",
		description: this.description
	}

	compiledErrorContext = compileErrorContext(this.errorContext)

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

export const Predicate = {
	implementation,
	Node: PredicateNode
}

export type Predicate<data = any> = (
	data: data,
	ctx: TraversalContext
) => boolean

export type PredicateCast<input = never, narrowed extends input = input> = (
	input: input,
	ctx: TraversalContext
) => input is narrowed
