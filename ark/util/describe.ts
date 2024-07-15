import type { array } from "./arrays.js"
import type { describeDomainOf, domainOf, inferDomain } from "./domain.js"
import type { isAny, isNever, satisfy, Stringifiable } from "./generics.js"
import type { describeObject } from "./objectKinds.js"
import type { stringifyUnion, unionToTuple } from "./unionToTuple.js"

export type DescribeOptions = {
	includeArticles?: boolean
	branchDelimiter?: string
}

export type typeToString<t, opts extends DescribeOptions = {}> = stringifyUnion<
	isAny<t> extends true ? "any"
	: isNever<t> extends true ? "never"
	: unknown extends t ? "unknown"
	: t extends array ? describeArray<t, opts>
	: t extends object ? describeObject<t, opts>
	: t extends Stringifiable ?
		// if it's the base wideneded domain, use that name
		inferDomain<domainOf<t>> extends t ?
			describeDomainOf<t, opts>
		:	// otherwise if it's a literal, use that
			`${t}`
	:	describeDomainOf<t, opts>,
	opts["branchDelimiter"] extends string ? opts["branchDelimiter"]
	:	describeDefaults["branchDelimiter"]
>

export type describe<t> = typeToString<
	t,
	{
		includeArticles: true
		branchDelimiter: " or "
	}
>

type describeArray<t extends array, opts extends DescribeOptions> =
	unionToTuple<t[number]> extends infer elementBranches extends unknown[] ?
		elementBranches["length"] extends 1 ?
			`${typeToString<t[number], opts>}[]`
		:	`(${typeToString<t[number], opts>})[]`
	:	never

export type describeDefaults = satisfy<
	Required<DescribeOptions>,
	{
		includeArticles: false
		branchDelimiter: " | "
	}
>
