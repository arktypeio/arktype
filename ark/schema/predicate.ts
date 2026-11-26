import { baseNameOf, returnsReports, type Fn } from "@ark/util"
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
	saysOf,
	silentCtx,
	type AliasDepth,
	type InternalTraversal,
	type Says,
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
	tAllows(data: unknown, ctx: InternalTraversal | AliasDepth): boolean {
		// called detached, as compiled code calls it, and passed a ctx dropping
		// what it reports where a build proved it returns only that
		const predicate = this.predicate
		return predicate(data, (this.reportsPred ? silentCtx : ctx) as never)
	}

	errorCtx: Predicate.ErrorContext = {
		code: "predicate",
		description: this.description,
		predicate: this.predicate,
		meta: this.meta
	}

	// what the error a keyword's predicate raises says in place of the
	// keyword's text, passed to it as its third argument
	says: Says | undefined = saysOf(this.meta, this.predicate)

	tApply(data: unknown, ctx: InternalTraversal): void {
		const errN = ctx.errN
		const predicate = this.predicate
		const label = this.meta.label
		const says = this.says
		// set aside, as a labeled callback applying this node to its own ctx
		// still names its value in what it raises after
		let outer: string | undefined
		if (label !== undefined) {
			outer = ctx.lbl
			ctx.lbl = label
		}
		const valid =
			says === undefined ?
				predicate(data, ctx.external)
			:	(predicate as Fn)(data, ctx.external, says)
		if (label !== undefined) ctx.lbl = outer
		if (!valid && ctx.errN === errN) ctx.nodeError(this.errorCtx, data)
	}

	compile(js: NodeCompiler): void {
		const condition = `${js.ref(this.predicate)}(data, ctx${this.says ? `, ${JSON.stringify(this.says)}` : ""})`
		if (js.trav === "Allows") {
			js.return(
				returnsReports.has(this.predicate) ?
					`${js.ref(this.predicate)}(data, ${js.ref(silentCtx)})`
				:	condition
			)
			return
		}
		if (js.addsNoIssues?.(this.predicate)) {
			// a build may answer `allows` with this, and a narrow returns anything
			js.return(`!!${condition} || !${js.error(this)}`)
			return
		}

		js.initErrCount()
		const label = this.meta.label
		// a labeled narrow names its value in what it raises, as in the error
		// returning false adds: an unlabeled one's call is as it was. The label
		// it runs under is a callback's that applied it, set again once it returns
		if (label !== undefined) {
			js.const("lbl", "ctx.lbl")
				.line(`ctx.lbl = ${JSON.stringify(label)}`)
				.const("valid", condition)
				.line("ctx.lbl = lbl")
		}
		js.if(
			// only add the default error if the predicate didn't add one itself
			`!${label === undefined ? condition : "valid"} && ctx.errN === errN`,
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
