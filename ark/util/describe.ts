import type { array } from "./arrays.js"
import type { describeDomainOf, domainOf, inferDomain } from "./domain.js"
import type { isAny, isNever, Stringifiable } from "./generics.js"
import type { describeObject } from "./objectKinds.js"
import type { stringifyUnion } from "./unionToTuple.js"

export type DescribeOptions = {
	excludeArticles?: boolean
	branchDelimiter?: string
}

export type describe<t, opts extends DescribeOptions = {}> = stringifyUnion<
	isAny<t> extends true ? "any"
	: isNever<t> extends true ? "never"
	: unknown extends t ? "unknown"
	: t extends array ? "an array"
	: t extends object ? describeObject<t, opts>
	: t extends Stringifiable ?
		// if it's the base wideneded domain, use that name
		inferDomain<domainOf<t>> extends t ?
			describeDomainOf<t, opts>
		:	// otherwise if it's a literal, use that
			`${t}`
	:	describeDomainOf<domainOf<t>, opts>,
	opts["branchDelimiter"] extends string ? opts["branchDelimiter"] : " or "
>

export type describeExpression<t> = describe<
	t,
	{
		excludeArticles: true
		branchDelimiter: " | "
	}
>
