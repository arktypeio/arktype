import type { Morph } from "@arktype/schema"
import type {
	conform,
	entryOf,
	ErrorMessage,
	evaluate,
	Fn,
	isDisjoint,
	join,
	paramsOf,
	replaceKey,
	returnOf,
	unionToTuple,
	valueOf
} from "@arktype/util"
import type { Scope } from "./scope.ts"
import type { Ark } from "./scopes/ark.ts"
import { Type, type inferTypeRoot, type validateTypeRoot } from "./type.ts"

type cedille = "¸"

type serializedWhentry<
	k extends string,
	v extends string
> = `[${k}${cedille}${v}]`

type parseWhentryKey<
	s extends string,
	$,
	result = {}
> = s extends `${serializedWhentry<infer k, infer v>}${cedille}${infer tail}`
	? validateTypeRoot<v, $> extends ErrorMessage<infer message>
		? ErrorMessage<message>
		: parseWhentryKey<tail, $, result & { [_ in k]: inferTypeRoot<v, $> }>
	: s extends serializedWhentry<infer k, infer v>
	? validateTypeRoot<v, $> extends ErrorMessage<infer message>
		? ErrorMessage<message>
		: evaluate<result & { [_ in k]: inferTypeRoot<v, $> }>
	: validateTypeRoot<s, $> extends ErrorMessage<infer message>
	? ErrorMessage<message>
	: never

export type WhenParser<$> = <const def>(
	def: validateTypeRoot<def, $>
) => join<
	unionToTuple<`[${join<conform<entryOf<def>, [string, string]>, cedille>}]`>,
	cedille
>

export const createWhenParser = <$>(scope: Scope): WhenParser<$> => {
	const parser = (def: unknown) => new Type(def, scope).alias
	return parser as never
}

type MatchContext = {
	inConstraint: unknown
	outConstraint: unknown
	thens: readonly Fn[]
	$: unknown
}

type validateCases<cases, ctx extends MatchContext> = {
	// adding keyof $ explicitly provides key completions for aliases
	[k in keyof cases | keyof ctx["$"]]?: k extends validateTypeRoot<k, ctx["$"]>
		? (
				In: ctx["inConstraint"] & inferTypeRoot<k, ctx["$"]>
		  ) => ctx["outConstraint"]
		: parseWhentryKey<k & string, ctx["$"]> extends ErrorMessage<infer message>
		? ErrorMessage<message>
		: (In: parseWhentryKey<k & string, ctx["$"]>) => ctx["outConstraint"]
}

export type MatchParser<$> = {
	<In = unknown, Out = unknown>(): ChainableMatchParser<{
		inConstraint: In
		outConstraint: Out
		thens: []
		$: $
	}>
} & CaseMatchParser<{
	inConstraint: unknown
	outConstraint: unknown
	thens: []
	$: $
}>

export type CaseMatchParser<ctx extends MatchContext> = <cases>(
	def: conform<cases, validateCases<cases, ctx>>
) => ChainableMatchParser<
	replaceKey<ctx, "thens", [...ctx["thens"], ...unionToTuple<valueOf<cases>>]>
>

export type WhenMatchParser<ctx extends MatchContext> = <
	def,
	then extends (
		In: ctx["inConstraint"] & inferTypeRoot<def, ctx["$"]>
	) => ctx["outConstraint"]
>(
	when: validateTypeRoot<def, ctx["$"]>,
	then: then
) => ChainableMatchParser<replaceKey<ctx, "thens", [...ctx["thens"], then]>>

type Z = MatchInvokation<{
	$: Ark
	inConstraint: unknown
	outConstraint: unknown
	thens: [
		(data: { a: string; b: (number | bigint)[] }) => (number | bigint)[],
		(b: boolean) => boolean,
		(s: string) => number
	]
}>

export type MatchInvokation<ctx extends MatchContext> = <
	data extends ctx["inConstraint"]
>(
	In: data
) => {
	[i in Extract<keyof ctx["thens"], `${number}`>]: isDisjoint<
		data,
		paramsOf<ctx["thens"][i]>[0]
	> extends true
		? never
		: returnOf<ctx["thens"][i]>
}[Extract<keyof ctx["thens"], `${number}`>]

export type ChainableMatchParser<ctx extends MatchContext> =
	MatchInvokation<ctx> & {
		cases: CaseMatchParser<ctx>
		when: WhenMatchParser<ctx>
	}

export const createMatchParser = <$>(scope: Scope): MatchParser<$> => {
	// TODO: move to match node, discrimination
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
