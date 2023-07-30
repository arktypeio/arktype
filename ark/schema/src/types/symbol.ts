import type { BaseAttributes } from "../node.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type SymbolConstraints = PredicateConstraints

export class SymbolNode extends PredicateNode<
	SymbolConstraints,
	BaseAttributes
> {
	readonly domain = "symbol"

	override writeDefaultBaseDescription() {
		return "a symbol"
	}
}
