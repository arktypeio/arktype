import type { UniversalConstraints } from "../constraints/constraint.js"
import { PredicateNode } from "./predicate.js"

export class BigintNode extends PredicateNode<UniversalConstraints> {
	readonly domain = "bigint"

	override writeDefaultBaseDescription() {
		return "a bigint"
	}
}
