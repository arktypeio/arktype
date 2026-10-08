import { baseNameOf, printable } from "@ark/util"
import { BaseConstraint } from "./constraint.ts"
import type { Morph } from "./roots/morph.ts"
import type { NodeCompiler } from "./shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNodeInput,
	declareNode
} from "./shared/declare.ts"
import { implementNode, type nodeImplementationOf } from "./shared/implement.ts"
import { describeCause, keywordWriterOf, type Locale } from "./shared/locale.ts"
import type {
	Traversal,
	TraverseAllows,
	TraverseApply
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
			intersectionIsOpen: true
			errorContext: ErrorContext
		}> {}

	export type Node = PredicateNode
}

// reads predicate, or for pipe.try the morph that threw
const describePredicate = (ctx: { predicate?: Predicate; morph?: Morph }) =>
	`valid according to ${(ctx.predicate ?? ctx.morph)?.name || "an anonymous predicate"}`

const implementation: nodeImplementationOf<Predicate.Declaration> =
	implementNode<Predicate.Declaration>({
		kind: "predicate",
		hasAssociatedError: true,
		collapsibleKey: "predicate",
		keys: {
			predicate: {}
		},
		defaults: {
			description: describePredicate,
			// error contexts from ctx.reject have neither a description nor a predicate
			expected: ctx => ctx.description ?? describePredicate(ctx),
			// a keyword's nodes describe their errors through meta, so its phrase
			// writes only errors it raises through ctx: their actual, and the
			// problem of one that carries what the keyword caught
			actual: (data, ctx, info) => {
				const locale = info as Locale
				const actual =
					ctx.predicate === undefined ?
						keywordWriterOf(ctx, locale, "actual")
					:	undefined
				return (
					actual === undefined ?
						ctx.morph ?
							`aborted due to error:\n    ${describeCause(ctx.cause)}\n`
						:	printable(data)
					: typeof actual === "string" ? actual
					: actual(data, ctx, locale)
				)
			},
			problem: (ctx, info) => {
				const locale = info as Locale
				const problem =
					ctx.cause === undefined ?
						undefined
					:	keywordWriterOf(ctx, locale, "problem")
				return (
					problem === undefined ? locale.problem(ctx, locale)
					: typeof problem === "string" ? problem
					: problem(ctx, locale)
				)
			}
		},
		intersectionIsOpen: true
	})

export class PredicateNode extends BaseConstraint<Predicate.Declaration> {
	impliedBasis = null

	expression: string = baseNameOf(this.predicate)
	traverseAllows: TraverseAllows = this.predicate as never

	errorContext: Predicate.ErrorContext = {
		code: "predicate",
		description: this.description,
		predicate: this.predicate,
		meta: this.meta
	}

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
			() =>
				js.line(
					`ctx.errorFromNodeContext(${js.errorContext(this.errorContext)})`
				)
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
