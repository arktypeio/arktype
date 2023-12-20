import type { Morph } from "@arktype/schema"
import type {
	Fn,
	isDisjoint,
	replaceKey,
	returnOf,
	unionToTuple,
	valueOf
} from "@arktype/util"
import type { Scope } from "./scope.js"
import { Type, type inferTypeRoot, type validateTypeRoot } from "./type.js"

type MatchContext = {
	inConstraint: unknown
	outConstraint: unknown
	thens: readonly Fn[]
	$: unknown
}

type validateCases<cases, ctx extends MatchContext> = {
	[k in keyof cases | keyof ctx["$"] | "default"]?: k extends "default"
		? (In: ctx["inConstraint"]) => ctx["outConstraint"]
		: k extends validateTypeRoot<k, ctx["$"]>
		  ? (
					In: ctx["inConstraint"] & inferTypeRoot<k, ctx["$"]>
		    ) => ctx["outConstraint"]
		  : validateTypeRoot<k, ctx["$"]>
}

type errorCases<cases, ctx extends MatchContext> = {
	[k in keyof cases]?: k extends "default"
		? (In: ctx["inConstraint"]) => ctx["outConstraint"]
		: k extends validateTypeRoot<k, ctx["$"]>
		  ? (
					In: ctx["inConstraint"] & inferTypeRoot<k, ctx["$"]>
		    ) => ctx["outConstraint"]
		  : validateTypeRoot<k, ctx["$"]>
} & {
	[k in Exclude<keyof ctx["$"], keyof cases>]?: (
		In: ctx["inConstraint"] & ctx["$"][k]
	) => ctx["outConstraint"]
} & {
	default?: (In: ctx["inConstraint"]) => ctx["outConstraint"]
}

export type CaseMatchParser<ctx extends MatchContext> = {
	<cases>(
		def: cases extends validateCases<cases, ctx>
			? cases
			: errorCases<cases, ctx>
	): ChainableMatchParser<
		replaceKey<ctx, "thens", [...ctx["thens"], ...unionToTuple<valueOf<cases>>]>
	>
}
// {
// 	<In = unknown, Out = unknown>(): ChainableMatchParser<{
// 		inConstraint: In
// 		outConstraint: Out
// 		thens: []
// 		$: $
// 	}>
// } &

export type MatchParser<$> = CaseMatchParser<{
	inConstraint: unknown
	outConstraint: unknown
	thens: []
	$: $
}>

export type WhenMatchParser<ctx extends MatchContext> = <
	def,
	then extends (
		In: ctx["inConstraint"] & inferTypeRoot<def, ctx["$"]>
	) => ctx["outConstraint"]
>(
	when: validateTypeRoot<def, ctx["$"]>,
	then: then
) => ChainableMatchParser<replaceKey<ctx, "thens", [...ctx["thens"], then]>>

export type MatchInvocation<ctx extends MatchContext> = <
	data extends ctx["inConstraint"]
>(
	data: data
) => {
	[i in Extract<keyof ctx["thens"], `${number}`>]: ctx["thens"][i] extends Fn<
		[infer In],
		infer Out
	>
		? isDisjoint<data, In> extends true
			? never
			: Out
		: returnOf<ctx["thens"][i]>
}[Extract<keyof ctx["thens"], `${number}`>]

export type ChainableMatchParser<ctx extends MatchContext> =
	MatchInvocation<ctx> & {
		cases: CaseMatchParser<ctx>
		when: WhenMatchParser<ctx>
	}

export const createMatchParser = <$>(scope: Scope): MatchParser<$> => {
	const parser = (cases: Record<string, Morph>) => {
		const caseArray = Object.entries(cases).map(([def, morph]) => ({
			when: new Type(def, scope).allows,
			then: morph
		}))
		return (data: unknown) => {
			for (const c of caseArray) {
				if (c.when(data)) {
					return c.then(data, {} as never)
				}
			}
		}
	}
	return parser as never
}
