import type { extend } from "@arktype/util"
import { domainOf } from "@arktype/util"
import type { UniversalConstraints } from "../constraints/constraint.js"
import type { EqualityConstraint } from "../constraints/equality.js"
import { PredicateNode } from "./predicate.js"

export type UnitConstraints = extend<
	UniversalConstraints,
	{
		readonly value: EqualityConstraint
	}
>

export class UnitNode extends PredicateNode<UnitConstraints> {
	readonly domain = domainOf(this.constraints.value)

	override writeDefaultBaseDescription() {
		return ""
	}
}
