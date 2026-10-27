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
			stacks: true
			errorCtx: ErrorContext
		}> {}

	export type Node = PredicateNode
}

const implementation: nodeImplementationOf<Predicate.Declaration> =
	implementNode<Predicate.Declaration>({
		kind: "predicate",
		ownErr: true,
		bareKey: "predicate",
		keys: {
			predicate: {}
		},
		defaults: {
			description: describePredicate
		},
		stacks: true
	})

export class PredicateNode extends BaseConstraint<Predicate.Declaration> {
	implied = null

	expression: string = baseNameOf(this.predicate)
	traverseAllows(data: unknown, ctx: InternalTraversal | AliasDepth): boolean {
		// called detached, as compiled code calls it
		const predicate = this.predicate
		return predicate(data, ctx as never)
	}

	errorCtx: Predicate.ErrorContext = {
		code: "predicate",
		description: this.description,
		predicate: this.predicate,
		meta: this.meta
	}

	traverseApply(data: unknown, ctx: InternalTraversal): void {
		const errN = ctx.errN
		const predicate = this.predicate
		if (!predicate(data, ctx.external) && ctx.errN === errN)
			ctx.nodeError(this.errorCtx, data)
	}

	compile(js: NodeCompiler): void {
		const condition = `${js.ref(this.predicate)}(data, ctx)`
		if (js.trav === "Allows") {
			js.return(condition)
			return
		}
		if (js.addsNoIssues?.(this.predicate)) {
			js.return(`${condition} || !${js.error(this)}`)
			return
		}

		js.initErrCount()
		js.if(
			// only add the default error if the predicate didn't add one itself
			`!${condition} && ctx.errN === errN`,
			() => js.return(`!${js.error(this)}`)
		)
		js.return("!ctx.failFast || ctx.errN === errN")
	}
}

export const Predicate = {
	impl: implementation,
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
