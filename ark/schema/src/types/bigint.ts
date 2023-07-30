import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export class BigintNode extends PredicateNode<PredicateConstraints<{}>> {
	readonly domain = "bigint"

	override writeDefaultBaseDescription() {
		return "a bigint"
	}
}
