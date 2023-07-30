import type { BaseAttributes } from "../node.js"
import type { PredicateConstraints } from "./predicate.js"
import { PredicateNode } from "./predicate.js"

export type BigintConstraints = PredicateConstraints

export class BigintNode extends PredicateNode<
	BigintConstraints,
	BaseAttributes
> {
	readonly domain = "bigint"

	override writeDefaultBaseDescription() {
		return "a bigint"
	}
}
