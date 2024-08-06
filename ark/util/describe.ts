import type { array } from "./arrays.js"
import type { describeDomainOf, domainOf, inferDomain } from "./domain.js"
import type { anyOrNever, satisfy, Stringifiable } from "./generics.js"
import type { describeObject } from "./objectKinds.js"
import type { stringifyUnion } from "./unionToTuple.js"

export type DescribeOptions = {
	includeArticles?: boolean
	branchDelimiter?: string
}

export type typeToString<t, opts extends DescribeOptions = {}> = stringifyUnion<
	[t] extends [anyOrNever] ?
		unknown extends t ?
			"any"
		:	"never"
	: unknown extends t ? "unknown"
	: boolean extends t ?
		| "boolean"
		| ([t] extends [boolean] ? never : typeToString<Exclude<t, boolean>, opts>)
	: t extends array ? arrayTypeToString<t, opts>
	: t extends object ? describeObject<t, opts>
	: t extends Stringifiable ? stringifiableToString<t, opts>
	: describeDomainOf<t, opts>,
	opts["branchDelimiter"] extends string ? opts["branchDelimiter"]
	:	describeDefaults["branchDelimiter"]
>

type stringifiableToString<
	t extends Stringifiable,
	opts extends DescribeOptions
> =
	// if it's the base wideneded domain, use that name
	inferDomain<domainOf<t>> extends t ? describeDomainOf<t, opts>
	:	// otherwise if it's a literal, use that
		`${t}`

export type describe<t> = typeToString<
	t,
	{
		includeArticles: true
		branchDelimiter: " or "
	}
>

type arrayTypeToString<t extends array, opts extends DescribeOptions> =
	typeToString<t[number], opts> extends infer element extends string ?
		opts["includeArticles"] extends true ? describeArrayOf<element>
		: includesDelimiter<element, opts> extends true ? `(${element})[]`
		: `${element}[]`
	:	never

type describeArrayOf<element extends string> =
	element extends "unknown" ? "an array" : `an array of ${element}`

type includesDelimiter<s extends string, opts extends DescribeOptions> =
	s extends (
		`${string}${opts["branchDelimiter"] extends string ? opts["branchDelimiter"] : describeDefaults["branchDelimiter"]}${string}`
	) ?
		true
	:	false

export type describeDefaults = satisfy<
	Required<DescribeOptions>,
	{
		includeArticles: false
		branchDelimiter: " | "
	}
>
