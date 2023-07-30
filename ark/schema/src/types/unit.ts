import type { extend } from "@arktype/util"
import { domainOf, stringify } from "@arktype/util"

import type { UniversalConstraints } from "../constraints/constraint.js"
import { PredicateNode } from "./predicate.js"

export type UnitConstraints = extend<
	UniversalConstraints,
	{
		readonly value: unknown
	}
>

export class UnitNode extends PredicateNode<UnitConstraints> {
	readonly domain = domainOf(this.constraints.value)

	override writeDefaultBaseDescription(constraints: UnitConstraints) {
		// TODO: add reference to for objects
		return stringify(constraints.value)
	}
}
