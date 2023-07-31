import type { DomainConstraints } from "../constraints/constraint.js"
import { PredicateNode } from "./predicate.js"

export class BigintNode extends PredicateNode<DomainConstraints> {
	readonly domain = "bigint"

	override writeDefaultBaseDescription() {
		return "a bigint"
	}
}
