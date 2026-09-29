import { BaseConstraint } from "./constraint.ts"
import type { NodeCompiler } from "./shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "./shared/declare.ts"
import { defaultErrorWriters } from "./shared/errorWriters.ts"
import {
	compileObjectLiteral,
	implementNode,
	type nodeImplementationOf
} from "./shared/implement.ts"
import {
	type RegisteredReference,
	registeredReference
} from "./shared/registry.ts"
import type {
	Traversal,
	TraverseAllows,
	TraverseApply
} from "./shared/traversal.ts"

export declare namespace Predicate {
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
		collapsibleKey: "predicate",
		keys: {
			predicate: {}
		},
		normalize: schema =>
			typeof schema === "function" ? { predicate: schema } : schema,
		defaults: defaultErrorWriters.predicate,
		intersectionIsOpen: true
	})

export class PredicateNode extends BaseConstraint<Predicate.Declaration> {
	serializedPredicate: RegisteredReference = registeredReference(this.predicate)

	impliedBasis = null

	expression: string = this.serializedPredicate
	traverseAllows: TraverseAllows = this.predicate as never

	errorContext: Predicate.ErrorContext = {
		code: "predicate",
		description: this.description,
		meta: this.meta
	}

	compiledErrorContext = compileObjectLiteral(this.errorContext)

	traverseApply: TraverseApply = (data, ctx) => {
		const errorCount = ctx.currentErrorCount
		if (
			!this.predicate(data, ctx.external) &&
			ctx.currentErrorCount === errorCount
		)
			ctx.errorFromNodeContext(this.errorContext)
	}

	compile(js: NodeCompiler): void {
		const condition = `${js.ref(this.predicate)}(data, ctx)`
		if (js.traversalKind === "Allows") {
			js.return(condition)
			return
		}

		js.initializeErrorCount()
		js.if(
			// only add the default error if the predicate didn't add one itself
			`!${condition} && ctx.currentErrorCount === errorCount`,
			() => js.line(`ctx.errorFromNodeContext(${this.compiledErrorContext})`)
		)
	}
}

export const Predicate = {
	implementation,
	Node: PredicateNode
}

export type Predicate<data = any> = (data: data, ctx: Traversal) => boolean

export declare namespace Predicate {
	export type Casted<input = never, narrowed extends input = input> = (
		input: input,
		ctx: Traversal
	) => input is narrowed

	export type Castable<input = never, narrowed extends input = input> =
		| Predicate<input>
		| Casted<input, narrowed>
}
