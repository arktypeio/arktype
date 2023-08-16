import type { listable } from "@arktype/util"
import type { ConstraintNode } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import type { RootNode } from "./type.js"
import { TypeNode } from "./type.js"

export type PredicateRule = {
	[k in string]?: listable<ConstraintNode>
}

export class PredicateNode<
	t = unknown,
	definition extends PredicateRule = PredicateRule
> extends TypeNode<t, readonly ConstraintNode[]> {
	readonly kind = "predicate"

	writeDefaultDescription() {
		const flat = Object.values(this.rule).flat()
		return flat.length ? flat.join(" and ") : "a value"
	}

	references() {
		return []
	}

	intersect(other: RootNode): RootNode | Disjoint {
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
