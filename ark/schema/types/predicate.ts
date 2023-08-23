import type { AbstractableConstructor, Dict, listable } from "@arktype/util"
import type { AttributeKind } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import type { BaseDefinition } from "../node.js"
import type { RangeConstraintSet } from "../traits/bound.js"
import type { DivisorNode } from "../traits/divisor.js"
import type { DomainNode, NonEnumerableDomain } from "../traits/domain.js"
import type { IdentityNode } from "../traits/identity.js"
import type { InstanceOfNode } from "../traits/instanceOf.js"
import type { MorphNode } from "../traits/morph.js"
import type { NarrowNode } from "../traits/narrow.js"
import type { RuleKind, RuleNode, RuleSet } from "../traits/trait.js"
import type { TypeNode } from "./type.js"
import { TypeNodeBase } from "./type.js"

export interface PredicateDefinition extends BaseDefinition {
	readonly morph?: readonly MorphNode[]
}

export class PredicateNode<t = unknown> extends TypeNodeBase<
	t,
	PredicateDefinition
> {
	readonly kind = "predicate"
	readonly constraints = Object.values(this.rules).flat() as readonly RuleNode[]

	writeDefaultDescription() {
		const flat = Object.values(this.rules).flat()
		return flat.length ? flat.join(" and ") : "a value"
	}

	references() {
		return this.constraints
	}

	intersect(other: TypeNode): TypeNode | Disjoint {
		if (!other.hasKind("predicate")) {
			return other.intersect(this)
		}
		let result: readonly RuleNode[] | Disjoint = this.constraints
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

export interface UnitRule {
	readonly identity: IdentityNode
}

export interface UnknownPredicateRule extends PredicateDefinition {
	readonly narrow?: readonly NarrowNode[]
}

export interface NumberPredicateRule extends DomainPredicateRule<"number"> {
	readonly range?: RangeConstraintSet
	readonly divisor?: DivisorNode
}

export interface InstancePredicateRule<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends DomainPredicateRule<"object"> {
	readonly instance: InstanceOfNode<constructor>
}

export interface StringPredicateRule extends DomainPredicateRule<"string"> {
	readonly length?: RangeConstraintSet
	readonly pattern?: DivisorNode
}

export interface DomainPredicateRule<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends UnknownPredicateRule {
	readonly domain: DomainNode<domain>
}

export interface DatePredicateRule extends InstancePredicateRule<typeof Date> {
	readonly range?: RangeConstraintSet
}

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1

// Figure out best design for integrating with named props.
export interface ArrayPredicateRule
	extends InstancePredicateRule<typeof Array> {
	readonly length?: RangeConstraintSet
	readonly prefix?: readonly TypeNodeBase[]
	readonly variadic?: TypeNodeBase
	readonly postfix?: readonly TypeNodeBase[]
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
