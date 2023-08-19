import type { AbstractableConstructor, Dict, listable } from "@arktype/util"
import type { AttributeKind } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import type { DivisorConstraint } from "../rules/divisor.js"
import type { DomainConstraint, NonEnumerableDomain } from "../rules/domain.js"
import type { IdentityConstraint } from "../rules/identity.js"
import type { InstanceOfConstraint } from "../rules/instanceOf.js"
import type { MorphAttribute } from "../rules/morph.js"
import type { NarrowConstraint } from "../rules/narrow.js"
import type { RangeConstraintSet } from "../rules/range.js"
import type { RuleKind, RuleNode, RuleSet } from "../rules/rule.js"
import type { TypeNode } from "./type.js"
import { TypeNodeBase } from "./type.js"

export interface PredicateAttributes extends BaseAttributes {
	readonly morph?: readonly MorphAttribute[]
}

export type ConstraintKindMap = Dict<string, RuleKind>

type allowConstraints<map extends ConstraintKindMap> = {
	[k in keyof map]: RuleSet<map[k]>
}

export type AttributeKindMap = Dict<string, AttributeKind>

type allowAttributes<map extends ConstraintKindMap> = {
	[k in keyof map]: RuleSet<map[k]>
}

export const definePredicate = <
	allowsConstraints extends ConstraintKindMap,
	allowsAttributes extends AttributeKindMap
>(
	allowsConstraints: allowsConstraints,
	allowsAttributes: allowsAttributes
) => {}

export class PredicateNode<
	t = unknown,
	rule extends {} = {},
	attributes extends PredicateAttributes = PredicateAttributes
> extends TypeNodeBase<t, rule, attributes> {
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
	readonly identity: IdentityConstraint
}

export interface UnknownPredicateRule extends PredicateAttributes {
	readonly narrow?: readonly NarrowConstraint[]
}

export interface NumberPredicateRule extends DomainPredicateRule<"number"> {
	readonly range?: RangeConstraintSet
	readonly divisor?: DivisorConstraint
}

export interface InstancePredicateRule<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends DomainPredicateRule<"object"> {
	readonly instance: InstanceOfConstraint<constructor>
}

export interface StringPredicateRule extends DomainPredicateRule<"string"> {
	readonly length?: RangeConstraintSet
	readonly pattern?: DivisorConstraint
}

export interface DomainPredicateRule<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends UnknownPredicateRule {
	readonly domain: DomainConstraint<domain>
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
