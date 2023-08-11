import type { listable, satisfy } from "@arktype/util"
import { BaseNode } from "../type.js"
import type { ConstructorConstraint } from "./constructor.js"
import type { DivisibilityConstraint } from "./divisibility.js"
import type { DomainConstraint } from "./domain.js"
import type { IdentityConstraint } from "./identity.js"
import type { NarrowConstraint, NarrowSet } from "./narrow.js"
import type { PropConstraint } from "./prop/prop.js"
import type { RangeConstraint, RangeSet } from "./range.js"
import type { RegexConstraint, RegexSet } from "./regex.js"

export abstract class ConstraintNode<rule = unknown> extends BaseNode<rule> {
	assertAllowedBy?(): void
}

// type ConstraintList = readonly Constraint[]

// /** @ts-expect-error allow extending narrowed readonly array */
// export class ConstraintSet<
// 	constraints extends ConstraintList = ConstraintList
// > extends ReadonlyArray<constraints> {
// 	// TODO: make sure in cases like range, the result is sorted
// 	add(constraint: constraints[number]): ConstraintSet<constraints> | Disjoint {
// 		const result = [] as mutable<ConstraintList>
// 		let includesConstraint = false
// 		for (let i = 0; i < this.length; i++) {
// 			const elementResult = this[i].intersect(constraint as never)
// 			if (elementResult === orthogonal) {
// 				result.push(this[i])
// 			} else if (elementResult instanceof Disjoint) {
// 				return elementResult
// 			} else if (!includesConstraint) {
// 				result.push(elementResult)
// 				includesConstraint = true
// 			} else if (!result.includes(elementResult)) {
// 				return throwInternalError(
// 					`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
// 				)
// 			}
// 		}
// 		if (!includesConstraint) {
// 			result.push(constraint)
// 		}
// 		return new ConstraintSet(result)
// 	}

// 	intersect(other: ConstraintSet<constraints>) {
// 		return this.reduce<ConstraintSet>((set, constraint) => {
// 			const next = constrain(set, constraint)
// 			return next instanceof Disjoint ? next.throw() : next
// 		}, []),
// 		let setResult: ConstraintSet<constraints> | Disjoint = this
// 		for (
// 			let i = 0;
// 			i < other.length && setResult instanceof ConstraintSet;
// 			i++
// 		) {
// 			if (setResult instanceof Disjoint) {
// 				return setResult
// 			}
// 			setResult = setResult.add(other[i])
// 		}
// 		return setResult
// 	}
// }

export type ConstraintsByKind = {
	constructor: ConstructorConstraint
	domain: DomainConstraint
	range: RangeConstraint
	divisibility: DivisibilityConstraint
	identity: IdentityConstraint
	narrow: NarrowConstraint
	regex: RegexConstraint
	prop: PropConstraint
}

export type ConstraintKind = keyof ConstraintsByKind

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

export type ConstraintSetsByKind = satisfy<
	{ [kind in ConstraintKind]: listable<Constraint<kind>> },
	{
		constructor: ConstructorConstraint
		domain: DomainConstraint
		range: RangeSet
		divisibility: DivisibilityConstraint
		identity: IdentityConstraint
		narrow: NarrowSet
		regex: RegexSet
		prop: PropConstraint
	}
>

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
