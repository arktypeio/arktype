import { type Morph } from "@arktype/schema"
import {
	type conform,
	type entryOf,
	type evaluate,
	type join,
	type paramsOf,
	type returnOf,
	type unionToTuple
} from "@arktype/util"
import { type Scope } from "./scope.ts"
import { type inferTypeRoot, Type, type validateTypeRoot } from "./type.ts"

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
	? parseWhentryKey<tail, $, result & { [_ in k]: inferTypeRoot<v, $> }>
	: s extends serializedWhentry<infer k, infer v>
	? evaluate<result & { [_ in k]: inferTypeRoot<v, $> }>
	: result

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

type validateCases<cases, $> = {
	[k in keyof cases]?: k extends validateTypeRoot<k, $>
		? (In: inferTypeRoot<k & string, $>) => unknown
		: (In: parseWhentryKey<k & string, $>) => unknown
}

export type MatchParser<$> = {
	<
		cases extends {
			// adding keyof $ explicitly provides key completions for aliases
			[k in keyof cases | keyof $]?: unknown
		}
	>(
		def: conform<cases, validateCases<cases, $>>
	): (In: paramsOf<cases[keyof cases]>[0]) => returnOf<cases[keyof cases]>
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
