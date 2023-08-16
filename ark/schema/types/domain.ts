import type { extend } from "@arktype/util"
import type {
	DomainConstraint,
	NonEnumerableDomain
} from "../constraints/domain.js"
import { PredicateNode } from "./predicate.js"
import type { UnknownPredicateRule } from "./unknown.js"

export type DomainPredicateRule<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = extend<
	UnknownPredicateRule,
	{
		readonly domain: DomainConstraint<domain>
	}
>

export class DomainPredicate extends PredicateNode<
	unknown,
	DomainPredicateRule
> {}
