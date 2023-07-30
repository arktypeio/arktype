import type { evaluate } from "@arktype/util"
import { stringify } from "@arktype/util"
import type { BaseAttributes } from "../node.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type UnitConstraints = evaluate<
	PredicateConstraints & {
		readonly value: unknown
	}
>

export class UnitNode extends PredicateNode<UnitConstraints, BaseAttributes> {
	override writeDefaultBaseDescription(rule: UnitConstraints) {
		// TODO: add reference to for objects
		return stringify(rule.value)
	}
}
