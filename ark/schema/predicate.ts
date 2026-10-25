import { baseNameOf } from "@ark/util"
import { BaseConstraint } from "./constraint.ts"
import type { Morph } from "./roots/morph.ts"
import type { NodeCompiler } from "./shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNodeInput,
	declareNode
} from "./shared/declare.ts"
import { implementNode, type nodeImplementationOf } from "./shared/implement.ts"
import {
	describePredicate,
	type AliasDepth,
	type InternalTraversal,
	type Traversal
} from "./shared/traversal.ts"

export declare namespace Predicate {
	export type Schema<predicate extends Predicate = Predicate> =
		| ExpandedSchema<predicate>
		| predicate

	export interface ExpandedSchema<predicate extends Predicate = Predicate>
		extends BaseNodeInput {
		readonly predicate: predicate
	}

	export interface Inner<predicate extends Predicate = Predicate> {
		readonly predicate: predicate
	}

	export interface ErrorContext extends BaseErrorContext<"predicate"> {
		readonly predicate?: Predicate
		/** the morph that threw, for pipe.try */
		readonly morph?: Morph
		readonly cause?: unknown
	}

	export interface Declaration
		extends declareNode<{
			kind: "predicate"
			inner: Inner
			openIntersection: true
			errorContext: ErrorContext
		}> {}

	export type Node = PredicateNode
}

const implementation: nodeImplementationOf<Predicate.Declaration> =
	implementNode<Predicate.Declaration>({
		kind: "predicate",
		ownsError: true,
		collapseKey: "predicate",
		keys: {
			predicate: {}
		},
		defaults: {
			description: describePredicate
		},
		openIntersection: true
	})

export class PredicateNode extends BaseConstraint<Predicate.Declaration> {
	impliedBasis = null

	expression: string = baseNameOf(this.predicate)
	traverseAllows(data: unknown, ctx: InternalTraversal | AliasDepth): boolean {
		// called detached, as compiled code calls it
		const predicate = this.predicate
		return predicate(data, ctx as never)
	}

	errorContext: Predicate.ErrorContext = {
		code: "predicate",
		description: this.description,
		predicate: this.predicate,
		meta: this.meta
	}

	traverseApply(data: unknown, ctx: InternalTraversal): void {
		const errorCount = ctx.currentErrorCount
		const predicate = this.predicate
		if (!predicate(data, ctx.external) && ctx.currentErrorCount === errorCount)
			ctx.errorFromNode(this.errorContext, data)
	}

	compile(js: NodeCompiler): void {
		const condition = `${js.ref(this.predicate)}(data, ctx)`
		if (js.traversalKind === "Allows") {
			js.return(condition)
			return
		}
		if (js.addsNoIssues?.(this.predicate)) {
			js.return(`${condition} || !${js.error(this)}`)
			return
		}

		js.initializeErrorCount()
		js.if(
			// only add the default error if the predicate didn't add one itself
			`!${condition} && ctx.currentErrorCount === errorCount`,
			() => js.return(`!${js.error(this)}`)
		)
		js.return("!ctx.failFast || ctx.currentErrorCount === errorCount")
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
