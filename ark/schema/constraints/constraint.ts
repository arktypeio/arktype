import type { mutable } from "@arktype/util"
import { ReadonlyArray, throwInternalError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { TypeNode } from "../type.js"
import type { BasisConstraint } from "./basis.js"
import type { BoundConstraint } from "./bound.js"
import type { DivisibilityConstraint } from "./divisibility.js"
import type { EqualityConstraint } from "./equality.js"
import type { NarrowConstraint } from "./narrow.js"
import type { RegexConstraint } from "./regex.js"

export type ConstraintsByKind = {
	basis: BasisConstraint
	bound: BoundConstraint
	divisibility: DivisibilityConstraint
	equality: EqualityConstraint
	narrow: NarrowConstraint
	regex: RegexConstraint
}

export abstract class Constraint<rule = unknown> extends TypeNode<rule> {
	declare readonly id: string

	abstract intersectConstraint(other: Constraint): rule | Orthogonal | Disjoint

	// Ensure the signature of this method reflects whether Disjoint and/or null
	// are possible intersection results for the subclass.
	intersectRules(
		other: Constraint
	):
		| this
		| Extract<ReturnType<this["intersectConstraint"]>, Orthogonal | Disjoint> {
		const ruleIntersection = this.intersectRules(other)
		if (ruleIntersection === null || ruleIntersection instanceof Disjoint) {
			return ruleIntersection as never
		}
		return new (this.constructor as any)(ruleIntersection)
	}
}

export const orthogonal = Symbol(
	"Represents an intersection result that cannot be reduced"
)

export type Orthogonal = typeof orthogonal

type ConstraintList = readonly Constraint<unknown>[]

export class ConstraintSet extends ReadonlyArray<ConstraintList> {
	protected constructor(...constraints: ConstraintList) {
		super(...constraints)
	}

	static from(...constraints: ConstraintList) {
		const set = constraints.reduce<ConstraintSet>((set, constraint) => {
			const next = set.add(constraint)
			return next instanceof Disjoint ? next.throw() : next
		}, new ConstraintSet())
		return set
	}

	// TODO: make sure in cases like range, the result is sorted
	add(constraint: Constraint): ConstraintSet | Disjoint {
		const result = [] as mutable<ConstraintList>
		let includesConstraint = false
		for (let i = 0; i < this.length; i++) {
			const elementResult = this[i].intersect(constraint)
			if (elementResult === null) {
				result.push(this[i])
			} else if (elementResult instanceof Disjoint) {
				return elementResult
			} else if (!includesConstraint) {
				result.push(elementResult)
				includesConstraint = true
			} else if (!result.includes(elementResult)) {
				return throwInternalError(
					`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
				)
			}
		}
		if (!includesConstraint) {
			result.push(constraint)
		}
		return new ConstraintSet(...result)
	}
}

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
