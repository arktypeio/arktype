import type { evaluate } from "@arktype/util"
import { stringify } from "@arktype/util"
import type { PredicateRule } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type UnitRule = evaluate<
	PredicateRule & {
		readonly value: unknown
	}
>

export class UnitNode extends PredicateNode<UnitRule, typeof UnitNode> {
	static override writeDefaultBaseDescription(rule: UnitRule) {
		// TODO: add reference to for objects
		return stringify(rule.value)
	}
}
