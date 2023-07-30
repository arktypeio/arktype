import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export class SymbolNode extends PredicateNode<PredicateConstraints<{}>> {
	readonly domain = "symbol"

	override writeDefaultBaseDescription() {
		return "a symbol"
	}
}
