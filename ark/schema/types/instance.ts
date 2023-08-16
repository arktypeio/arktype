import type { AbstractableConstructor, extend } from "@arktype/util"
import type { InstanceOfConstraint } from "../constraints/instanceOf.js"
import type { DomainPredicateRule } from "./domain.js"
import { PredicateNode } from "./predicate.js"

export type InstancePredicateRule<
	constructor extends AbstractableConstructor = AbstractableConstructor
> = extend<
	DomainPredicateRule<"object">,
	{ readonly instance: InstanceOfConstraint<constructor> }
>

export class InstancePredicate extends PredicateNode<
	unknown,
	InstancePredicateRule
> {}
