import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export class UnknownNode extends PredicateNode<PredicateConstraints<{}>> {
	readonly domain = null

	override writeDefaultBaseDescription() {
		return "a value"
	}
}
