import type { array } from "./arrays.js"
import type { describeDomainOf, domainOf, inferDomain } from "./domain.js"
import type { Stringifiable, isAny, isNever } from "./generics.js"
import type { describeObject } from "./objectKinds.js"
import type { stringifyUnion } from "./unionToTuple.js"

export type describe<
	t,
	branchDelimiter extends string = " or "
> = stringifyUnion<
	isAny<t> extends true ? "any"
	: isNever<t> extends true ? "never"
	: unknown extends t ? "unknown"
	: t extends array ? "an array"
	: t extends object ? describeObject<t>
	: t extends Stringifiable ?
		// if it's the base wideneded domain, use that name
		inferDomain<domainOf<t>> extends t ?
			describeDomainOf<t>
		:	// otherwise if it's a literal, use that
			`${t}`
	:	describeDomainOf<t>,
	branchDelimiter
>

export type describeExpression<t> = describe<t, " | ">
