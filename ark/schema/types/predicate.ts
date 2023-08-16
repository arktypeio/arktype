import type { listable } from "@arktype/util"
import type { DescriptionAttribute } from "../attributes/description.js"
import type { ConstraintNode } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import type { TypeNode } from "./type.js"
import { TypeNodeBase } from "./type.js"

export interface PredicateAttributes extends BaseAttributes {
	readonly morph?: readonly DescriptionAttribute[]
}

export type PredicateRule = { [k: string]: listable<ConstraintNode> }

export class PredicateNode<
	t = unknown,
	rule extends {} = {},
	attributes extends PredicateAttributes = PredicateAttributes
> extends TypeNodeBase<t, rule, attributes> {
	readonly kind = "predicate"
	readonly constraints = Object.values(
		this.rule
	).flat() as readonly ConstraintNode[]

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
		let result: readonly ConstraintNode[] | Disjoint = this.constraints
		for (const constraint of other.constraints) {
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
