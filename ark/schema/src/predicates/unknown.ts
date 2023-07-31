import type { UniversalConstraints } from "../constraints/constraint.js"
import { PredicateNode } from "./predicate.js"

export class UnknownNode extends PredicateNode<UniversalConstraints> {
	readonly domain = null

	override writeDefaultBaseDescription() {
		return "a value"
	}
}
