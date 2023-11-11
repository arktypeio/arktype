import {
	type conform,
	type entryOf,
	type evaluate,
	type fromEntries,
	type join,
	type returnOf,
	type unionToTuple
} from "@arktype/util"
import { type Scanner } from "../parser/string/shift/scanner.ts"
import { type Ark } from "../scopes/ark.ts"
import { type inferTypeRoot } from "../type.ts"

type parseEntries<
	s extends string,
	result extends [string, unknown][] = []
> = Scanner.shiftUntil<s, "•"> extends Scanner.shiftResult<
	infer lookahead,
	infer unscanned
>
	? lookahead extends `${infer k}·${infer v}`
		? unscanned extends `•${infer nextUnscanned}`
			? parseEntries<nextUnscanned, [...result, [k, inferTypeRoot<v, Ark>]]>
			: [...result, [k, inferTypeRoot<v, Ark>]]
		: s
	: result

type inferKey<s extends string> = parseEntries<s> extends readonly [
	string,
	unknown
][]
	? evaluate<fromEntries<parseEntries<s>>>
	: inferTypeRoot<s, Ark>

const match = <data>(data: data) =>
	data as (
		In: { [k in keyof data]: inferKey<k & string> }[keyof data]
	) => returnOf<data[keyof data]>

const when = <const data>(data: data) =>
	({}) as join<
		unionToTuple<join<conform<entryOf<data>, [string, string]>, "·">>,
		"•"
	>

const matcher = match({
	[when({
		a: "string",
		b: "boolean"
	})]: () => true,
	boolean: () => 5
})
