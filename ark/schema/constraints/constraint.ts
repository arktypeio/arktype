import { type extend, type mutable, throwInternalError } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import type { PredicateNode } from "../predicate.js"
import { BaseNode } from "../type.js"
import type { UnionNode } from "../union.js"
import type { ConstructorConstraint } from "./constructor.js"
import type { DivisibilityConstraint } from "./divisibility.js"
import type { DomainConstraint } from "./domain.js"
import type { EqualityConstraint } from "./equality.js"
import type { NarrowConstraint } from "./narrow.js"
import type { RangeConstraint } from "./range.js"
import type { RegexConstraint } from "./regex.js"

export abstract class ConstraintNode<rule = unknown> extends BaseNode<rule> {
	assertAllowedBy?(basis: BasisConstraint): true

	abstract intersectRules(other: this): rule | Orthogonal | Disjoint

	intersect(
		other: this
		// Ensure the signature of this method reflects whether Disjoint and/or null
		// are possible intersection results for the subclass.
	): this | Extract<ReturnType<this["intersectRules"]>, Orthogonal | Disjoint> {
		const ruleIntersection = this.intersectRules(other)
		if (
			ruleIntersection === orthogonal ||
			ruleIntersection instanceof Disjoint
		) {
			return ruleIntersection as never
		}
		return new (this.constructor as any)(ruleIntersection)
	}
}

export type BasisConstraint = DomainConstraint | ConstructorConstraint

export type NodesByKind = extend<
	ConstraintsByKind,
	{
		predicate: PredicateNode
		union: UnionNode
	}
>

export type NodeKind = keyof NodesByKind

export const orthogonal = Symbol(
	"Represents an intersection result between two compatible but independent constraints"
)

export type Orthogonal = typeof orthogonal

export type ConstraintsByKind = {
	constructor: ConstructorConstraint
	domain: DomainConstraint
	range: RangeConstraint
	divisibility: DivisibilityConstraint
	equality: EqualityConstraint
	narrow: NarrowConstraint
	regex: RegexConstraint
}

export type ConstraintKind = keyof ConstraintsByKind

export type Constraint = ConstraintsByKind[ConstraintKind]

export type ConstraintSet = readonly ConstraintNode[]

// export const assertAllowsConstraint = (
// 	basis: Node<BasisKind> | null,
// 	node: Node<RefinementKind>
// ) => {
// 	if (basis?.hasKind("unit")) {
// 		return throwInvalidConstraintError(
// 			node.kind,
// 			"a non-literal type",
// 			basis.toString()
// 		)
// 	}
// 	const domain = basis?.domain ?? "unknown"
// 	switch (node.kind) {
// 		case "divisor":
// 			if (domain !== "number") {
// 				throwParseError(writeIndivisibleMessage(domain))
// 			}
// 			return
// 		case "bound":
// 			if (domain !== "string" && domain !== "number") {
// 				const isDateClassBasis =
// 					basis?.hasKind("class") && basis.extendsOneOf(Date)
// 				if (isDateClassBasis) {
// 					if (!isDateLiteral(node.rule.limit)) {
// 						throwParseError(
// 							writeInvalidLimitMessage(
// 								node.rule.comparator,
// 								node.rule.limit,
// 								// TODO: we don't know if this is true, validate range together
// 								"right"
// 							)
// 						)
// 					}
// 					return
// 				}
// 				const hasSizedClassBasis =
// 					basis?.hasKind("class") && basis.extendsOneOf(Array)
// 				if (!hasSizedClassBasis) {
// 					throwParseError(writeUnboundableMessage(domain))
// 				}
// 			}
// 			if (typeof node.rule.limit !== "number") {
// 				throwParseError(
// 					writeInvalidLimitMessage(
// 						node.rule.comparator,
// 						node.rule.limit,
// 						// TODO: we don't know if this is true, validate range together
// 						"right"
// 					)
// 				)
// 			}
// 			return
// 		case "regex":
// 			if (domain !== "string") {
// 				throwInvalidConstraintError("regex", "a string", domain)
// 			}
// 			return
// 		case "props":
// 			if (domain !== "object") {
// 				throwInvalidConstraintError("props", "an object", domain)
// 			}
// 			return
// 		case "narrow":
// 			return
// 		default:
// 			throwInternalError(`Unexpected rule kind '${(node as Node).kind}'`)
// 	}
// }

// export const writeInvalidConstraintMessage = (
// 	kind: RefinementKind,
// 	typeMustBe: string,
// 	typeWas: string
// ) => {
// 	return `${kind} constraint may only be applied to ${typeMustBe} (was ${typeWas})`
// }

// export const throwInvalidConstraintError = (
// 	...args: Parameters<typeof writeInvalidConstraintMessage>
// ) => throwParseError(writeInvalidConstraintMessage(...args))
