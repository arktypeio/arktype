import type { DomainConstraints } from "../constraints/constraint.js"
import { PredicateNode } from "./predicate.js"

export class SymbolNode extends PredicateNode<DomainConstraints> {
	readonly domain = "symbol"

	override writeDefaultBaseDescription() {
		return "a symbol"
	}
}
