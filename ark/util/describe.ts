import type { describeDomainOf, domainOf } from "./domain.js"
import type { Stringifiable } from "./generics.js"
import type { describeObject } from "./objectKinds.js"
import type { stringifyUnion } from "./unionToTuple.js"

export type describe<
	t,
	branchDelimiter extends string = " or "
> = stringifyUnion<
	t extends object
		? describeObject<t>
		: t extends Stringifiable
		? domainOf<t> extends t
			? describeDomainOf<t>
			: `${t}`
		: describeDomainOf<t>,
	branchDelimiter
>
