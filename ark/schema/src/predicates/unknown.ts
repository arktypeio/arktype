import type { DomainConstraints } from "../constraints/constraint.js"
import { PredicateNode } from "./predicate.js"

export class UnknownNode extends PredicateNode<DomainConstraints> {
	readonly domain = null

	override writeDefaultBaseDescription() {
		return "a value"
	}
}
