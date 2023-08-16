import type { ConstraintNode } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import type { BaseRule } from "../node.js"
import type { TypeNode } from "./type.js"
import { TypeNodeBase } from "./type.js"

export interface PredicateRule extends BaseRule {}

export class PredicateNode<
	t = unknown,
	rule extends PredicateRule = PredicateRule
> extends TypeNodeBase<t, rule> {
	readonly kind = "predicate"
	readonly constraints = Object.values()
	0
	writeDefaultDescription() {
		const flat = Object.values(this.rule).flat()
		return flat.length ? flat.join(" and ") : "a value"
	}

	references() {
		return []
	}

	intersect(other: TypeNode): TypeNode | Disjoint {
		if (!other.hasKind("predicate")) {
			return other.intersect(this)
		}
		let result: readonly ConstraintNode[] | Disjoint = this.rule
		for (const constraint of other.rule) {
			if (result instanceof Disjoint) {
				break
			}
			result = constraint.apply(result)
		}
		// TODO: attributes
		return result instanceof Disjoint ? result : new PredicateNode(result)
	}

	keyof() {
		return this
	}
}

// throwParseError(
//     `'${k}' is not a valid constraint name (must be one of ${Object.keys(
//         constraintsByPrecedence
//     ).join(", ")})`
// )

// // TODO: naming
// export const constraintsByPrecedence: Record<
// 	BasisKind | RefinementKind,
// 	number
// > = {
// 	// basis
// 	domain: 0,
// 	class: 0,
// 	unit: 0,
// 	// shallow
// 	bound: 1,
// 	divisor: 1,
// 	regex: 1,
// 	// deep
// 	props: 2,
// 	// narrow
// 	narrow: 3
// }
