import type { UniversalConstraints } from "../constraints/constraint.js"
import { PredicateNode } from "./predicate.js"

export class SymbolNode extends PredicateNode<UniversalConstraints> {
	readonly domain = "symbol"

	override writeDefaultBaseDescription() {
		return "a symbol"
	}
}
