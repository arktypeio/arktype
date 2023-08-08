import type { extend, mutable } from "@arktype/util"
import { ReadonlyArray } from "@arktype/util"
import type { AttributesRecord } from "../attributes/attribute.js"
import type { DescriptionAttribute } from "../attributes/description.js"
import { Disjoint } from "../disjoint.js"
import type { IntersectableRecord } from "../shared.js"

export type ConstraintAttributes<attributes extends AttributesRecord> = extend<
	{ readonly description?: DescriptionAttribute },
	attributes
>

export abstract class Constraint<
	rule,
	attributes extends
		ConstraintAttributes<AttributesRecord> = ConstraintAttributes<{}>
> {
	constructor(
		public rule: rule,
		public attributes = {} as attributes
	) {}

	declare readonly id: string

	abstract writeDefaultDescription(): string

	abstract intersectRules(other: this): rule | Disjoint | orthogonal

	equals(other: this) {
		return this.id === other.id
	}

	// Ensure the signature of this method reflects whether Disjoint and/or null
	// are possible intersection results for the subclass.
	intersect(
		other: this
	): this | Extract<ReturnType<this["intersectRules"]>, null | Disjoint> {
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

export type orthogonal = typeof orthogonal

type ConstraintList = readonly Constraint<unknown>[]

/** @ts-expect-error allow extending narrowed readonly array */
export class ConstraintSet<
	constraints extends ConstraintList = ConstraintList
> extends ReadonlyArray<constraints> {
	// TODO: make sure in cases like range, the result is sorted
	add(constraint: constraints[number]): ConstraintSet<constraints> | Disjoint {
		const result = [] as unknown as mutable<constraints>
		let includesConstraint = false
		for (let i = 0; i < this.length; i++) {
			const elementResult = this[i].intersect(constraint)
			if (elementResult === null) {
				result.push(this[i])
			} else if (elementResult instanceof Disjoint) {
				return elementResult
			} else {
				result.push(elementResult)
				includesConstraint = true
			}
		}
		if (!includesConstraint) {
			result.push(constraint)
		}
		return new ConstraintSet(...result)
	}

	intersect(other: ConstraintSet<constraints>) {
		let setResult: ConstraintSet<constraints> | Disjoint = this
		for (
			let i = 0;
			i < other.length && setResult instanceof ConstraintSet;
			i++
		) {
			setResult = setResult.add(other[i])
		}
		return setResult
	}
}

export type ConstraintsRecord = IntersectableRecord

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
