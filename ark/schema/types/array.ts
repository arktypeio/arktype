import type { extend } from "@arktype/util"
import type { RangeConstraintSet } from "../constraints/range.js"
import type { InstancePredicateRule } from "./instance.js"
import { PredicateNode } from "./predicate.js"
import type { TypeNodeBase } from "./type.js"

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1

// Figure out best design for integrating with named props.
export interface ArrayPredicateRule
	extends InstancePredicateRule<typeof Array> {
	readonly length?: RangeConstraintSet
	readonly prefix?: readonly TypeNodeBase[]
	readonly variadic?: TypeNodeBase
	readonly postfix?: readonly TypeNodeBase[]
}

export class ArrayPredicate extends PredicateNode<
	readonly unknown[],
	ArrayPredicateRule
> {}
